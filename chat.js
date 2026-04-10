/**
 * Firestore 频道聊天（单文档省配额）：
 * 文档 channels/main 字段 chatFeed：每行一条 JSON（换行分隔）。
 * 界面显示最近 200 行；存满 300 行时在发送事务里删掉最旧 100 行。
 * Firebase compat，支持 file://。
 */
(function () {
  'use strict';

  var USER_STATE_KEY = 'AliceGarden_User_State';
  var MAX_LINES = 300;
  var PRUNE_COUNT = 100;
  var DISPLAY_COUNT = 200;
  var MAX_TEXT_LEN = 500;
  var CHAT_FEED_FIELD = 'chatFeed';

  /**
   * 随机特效池（自定义 WebP 贴纸 randomFx:true 时从中抽一类名；发送时写入 fx 索引，轻量且每条固定）。
   */
  var FX_POOL = [
    'chat-sticker--sparkle',
    'chat-sticker--rainbow',
    'chat-sticker--star',
    'chat-sticker--heart',
    'chat-sticker--fire',
    'chat-sticker--moon'
  ];

  /**
   * 默认贴纸：内置 SVG + 固定动效（randomFx:false）。
   * 自定义：WebP + randomFx:true，发送时随机 fx，也可在数组末尾追加条目。
   * 仅允许白名单 src，勿把用户输入当 URL。
   */
  var STICKERS = [
    { id: 'sparkle', src: 'assets/chat-stickers/sparkle.svg', alt: 'sparkle', randomFx: false, className: 'chat-sticker--sparkle' },
    { id: 'rainbow', src: 'assets/chat-stickers/rainbow.svg', alt: 'rainbow', randomFx: false, className: 'chat-sticker--rainbow' },
    { id: 'star', src: 'assets/chat-stickers/star.svg', alt: 'star', randomFx: false, className: 'chat-sticker--star' },
    { id: 'heart', src: 'assets/chat-stickers/heart.svg', alt: 'heart', randomFx: false, className: 'chat-sticker--heart' },
    { id: 'fire', src: 'assets/chat-stickers/fire.svg', alt: 'fire', randomFx: false, className: 'chat-sticker--fire' },
    { id: 'moon', src: 'assets/chat-stickers/moon.svg', alt: 'moon', randomFx: false, className: 'chat-sticker--moon' },
    { id: '001', src: 'assets/chat-stickers/001.webp', alt: '001', randomFx: true },
    { id: 'AZA001', src: 'assets/chat-stickers/AZA001.webp', alt: 'AZA001', randomFx: true }
    // 示例（放入同名 webp 后取消注释）：
    // ,{ id: 'my1', src: 'assets/chat-stickers/my1.webp', alt: '我的1', randomFx: true }
  ];

  var stickerById = {};
  STICKERS.forEach(function (s) {
    stickerById[s.id] = s;
  });

  function fxIndexDeterministic(t, v, len) {
    var s = String(t) + ':' + String(v);
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % len;
  }

  /** 贴纸气泡 CSS 类：默认固定；自定义用 row.fx 或确定性回退 */
  function stickerFxClassName(st, row) {
    var len = FX_POOL.length;
    if (!len) return '';
    if (!st.randomFx) {
      return st.className || FX_POOL[0];
    }
    var idx;
    if (typeof row.fx === 'number' && !isNaN(row.fx)) {
      idx = ((row.fx % len) + len) % len;
    } else {
      idx = fxIndexDeterministic(row.t, row.v, len);
    }
    return FX_POOL[idx];
  }

  function getDisplayName() {
    try {
      var raw = localStorage.getItem(USER_STATE_KEY);
      if (!raw) return '访客';
      var o = JSON.parse(raw);
      var n = o && o.name;
      if (typeof n === 'string' && n.trim()) return n.trim().slice(0, 40);
      return '访客';
    } catch (e) {
      return '访客';
    }
  }

  function chatDocRef(db) {
    return db.collection('channels').doc('main');
  }

  function setStatus(el, msg) {
    if (el) el.textContent = msg;
  }

  /** 解析 chatFeed 字符串为行对象数组（无效行跳过） */
  function parseChatLines(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw)
      .split('\n')
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean)
      .map(function (line) {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(function (row) {
        return row && typeof row === 'object' && typeof row.t === 'number';
      });
  }

  function formatLineTime(ms) {
    try {
      return new Date(ms).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  function renderFeed(listEl, entriesChronological) {
    if (!listEl) return;
    listEl.replaceChildren();
    var frag = document.createDocumentFragment();
    entriesChronological.forEach(function (row) {
      var rowEl = document.createElement('div');
      rowEl.className = 'chat-row';
      var meta = document.createElement('div');
      meta.className = 'chat-meta';
      var nameSpan = document.createElement('span');
      nameSpan.className = 'chat-name';
      nameSpan.textContent = String(row.n != null ? row.n : '—');
      var timeSpan = document.createElement('span');
      timeSpan.className = 'chat-time';
      timeSpan.textContent = formatLineTime(row.t);
      meta.appendChild(nameSpan);
      meta.appendChild(timeSpan);
      var body = document.createElement('div');
      body.className = 'chat-body';
      if (row.k === 's' && row.v && stickerById[row.v]) {
        var st = stickerById[row.v];
        var wrap = document.createElement('div');
        wrap.className = 'chat-sticker ' + stickerFxClassName(st, row);
        var img = document.createElement('img');
        img.className = 'chat-sticker__img';
        img.src = st.src;
        img.alt = st.alt || '';
        img.width = 200;
        img.height = 200;
        img.decoding = 'async';
        img.draggable = false;
        img.loading = 'lazy';
        img.addEventListener(
          'error',
          function () {
            img.style.display = 'none';
            var fb = document.createElement('span');
            fb.className = 'chat-sticker__fallback';
            fb.textContent = '[' + (st.alt || st.id) + ']';
            wrap.appendChild(fb);
          },
          { once: true }
        );
        wrap.appendChild(img);
        body.appendChild(wrap);
      } else {
        var p = document.createElement('p');
        p.className = 'chat-text';
        p.textContent = String(row.v != null ? row.v : '');
        body.appendChild(p);
      }
      rowEl.appendChild(meta);
      rowEl.appendChild(body);
      frag.appendChild(rowEl);
    });
    listEl.appendChild(frag);
    listEl.scrollTop = listEl.scrollHeight;
  }

  function initStickerBar(container) {
    if (!container) return;
    STICKERS.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-sticker-btn';
      btn.setAttribute('data-sticker-id', s.id);
      btn.setAttribute('title', s.alt || s.id);
      var thumb = document.createElement('img');
      thumb.className = 'chat-sticker-btn__thumb';
      thumb.src = s.src;
      thumb.alt = '';
      thumb.width = 28;
      thumb.height = 28;
      thumb.decoding = 'async';
      thumb.draggable = false;
      thumb.loading = 'lazy';
      thumb.addEventListener(
        'error',
        function () {
          thumb.style.display = 'none';
          var mark = document.createElement('span');
          mark.className = 'chat-sticker-btn__missing';
          mark.textContent = '?';
          mark.setAttribute('aria-hidden', 'true');
          btn.appendChild(mark);
        },
        { once: true }
      );
      btn.appendChild(thumb);
      container.appendChild(btn);
    });
  }

  /** 文本内换行会破坏「一行一条 JSON」，发送前压成空格 */
  function flattenText(s) {
    return String(s || '').replace(/\r?\n/g, ' ').trim();
  }

  function main() {
    var statusEl = document.getElementById('chat-status');
    var listEl = document.getElementById('chat-list');
    var inputEl = document.getElementById('chat-input');
    var sendBtn = document.getElementById('chat-send');
    var stickerBar = document.getElementById('chat-stickers');
    var namePreview = document.getElementById('chat-name-preview');

    if (namePreview) namePreview.textContent = getDisplayName();

    var cfg = window.__FIREBASE_CHAT_CONFIG__;
    if (!cfg || !cfg.apiKey || cfg.apiKey === 'REPLACE_ME') {
      setStatus(
        statusEl,
        '请在 chat-firebase-config.js 中填入 Firebase 配置（见 chat/README.md）。'
      );
      return;
    }

    if (typeof firebase === 'undefined') {
      setStatus(statusEl, 'Firebase SDK 未加载，请检查网络或脚本顺序。');
      return;
    }

    var db;
    try {
      if (firebase.apps && firebase.apps.length) {
        firebase.app();
      } else {
        firebase.initializeApp(cfg);
      }
      db = firebase.firestore();
    } catch (e) {
      setStatus(statusEl, 'Firebase 初始化失败：' + (e.message || String(e)));
      return;
    }

    var docRef = chatDocRef(db);
    var emojiToggle = document.getElementById('chat-emoji-toggle');
    var emojiPopover = document.getElementById('chat-emoji-popover');
    var emojiAnchor = emojiToggle ? emojiToggle.closest('.chat-emoji-anchor') : null;

    initStickerBar(stickerBar);

    function setEmojiPopoverOpen(open) {
      if (!emojiPopover || !emojiToggle) return;
      if (open) {
        emojiPopover.removeAttribute('hidden');
        emojiToggle.setAttribute('aria-expanded', 'true');
      } else {
        emojiPopover.setAttribute('hidden', '');
        emojiToggle.setAttribute('aria-expanded', 'false');
      }
    }

    if (emojiToggle && emojiPopover) {
      emojiToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var isHidden = emojiPopover.hasAttribute('hidden');
        setEmojiPopoverOpen(isHidden);
      });
      document.addEventListener('click', function (e) {
        if (emojiPopover.hasAttribute('hidden')) return;
        if (emojiAnchor && emojiAnchor.contains(e.target)) return;
        setEmojiPopoverOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !emojiPopover.hasAttribute('hidden')) {
          setEmojiPopoverOpen(false);
        }
      });
    }

    function applyDocSnapshot(doc) {
      var raw = doc.exists ? doc.data()[CHAT_FEED_FIELD] : '';
      var lines = parseChatLines(raw);
      var display = lines.slice(-DISPLAY_COUNT);
      renderFeed(listEl, display);
      setStatus(
        statusEl,
        '在线 · 显示 ' + display.length + ' 条 · 单文档共 ' + lines.length + ' 行（省读配额）'
      );
    }

    docRef.onSnapshot(
      function (doc) {
        applyDocSnapshot(doc);
      },
      function (err) {
        console.error(err);
        setStatus(statusEl, '监听失败：' + (err.message || String(err)));
      }
    );

    function appendEntryTransaction(entry) {
      return db.runTransaction(function (transaction) {
        return transaction.get(docRef).then(function (doc) {
          var raw = '';
          if (doc.exists && doc.data()[CHAT_FEED_FIELD]) {
            raw = String(doc.data()[CHAT_FEED_FIELD]);
          }
          var lines = parseChatLines(raw);
          lines.push(entry);
          if (lines.length >= MAX_LINES) {
            lines.splice(0, PRUNE_COUNT);
          }
          var payload = {};
          payload[CHAT_FEED_FIELD] = lines
            .map(function (row) {
              return JSON.stringify(row);
            })
            .join('\n');
          transaction.set(docRef, payload, { merge: true });
        });
      });
    }

    function sendText() {
      if (!inputEl) return;
      var t = flattenText(inputEl.value);
      if (!t) return;
      if (t.length > MAX_TEXT_LEN) {
        t = t.slice(0, MAX_TEXT_LEN);
      }
      inputEl.value = '';
      var entry = {
        t: Date.now(),
        n: getDisplayName(),
        k: 't',
        v: t
      };
      appendEntryTransaction(entry).catch(function (e) {
        setStatus(statusEl, '发送失败：' + (e.message || String(e)));
      });
    }

    function sendSticker(stickerId) {
      if (!stickerId || !stickerById[stickerId]) return;
      var st = stickerById[stickerId];
      var entry = {
        t: Date.now(),
        n: getDisplayName(),
        k: 's',
        v: stickerId
      };
      if (st.randomFx && FX_POOL.length) {
        entry.fx = Math.floor(Math.random() * FX_POOL.length);
      }
      appendEntryTransaction(entry).catch(function (e) {
        setStatus(statusEl, '发送失败：' + (e.message || String(e)));
      });
    }

    if (sendBtn) sendBtn.addEventListener('click', sendText);
    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendText();
        }
      });
    }
    if (stickerBar) {
      stickerBar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-sticker-id]');
        if (!btn) return;
        sendSticker(btn.getAttribute('data-sticker-id'));
        setEmojiPopoverOpen(false);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
