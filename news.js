/**
 * 货品图录 · Product Catalog
 * 数据源：保留原有 Google Sheets Visualization API (gviz/tq) JSONP 连接，
 * 支持本地 file:// 直接双击打开及静态网站部署（无 CORS 限制）。
 */
(function () {
  'use strict';

  var CONFIG = {
    SPREADSHEET_ID: '1WFuFX7jVCV0ZVm5HBsHbMB8qOew2wVhnL8tNzWsjss4',
    GID: '0',
    /** 最新 N 条显示 NEW 徽标 */
    NEW_BADGE_COUNT: 3,
    /** 默认每页显示件数 */
    DEFAULT_PAGE_SIZE: 20,
    /** hasText=false 加密区解锁密码（仅本次页面浏览有效，刷新后自动恢复锁定） */
    UNLOCK_PASS: 'alicecourtyardr18'
  };

  var THEME_STORAGE_KEY = 'CatalogTheme_Pref';

  /* ==================== 应用状态 ==================== */
  var state = {
    allItems: [],        // 原始已按最新排序后的全部货品对象
    unlocked: false,     // 本次页面加载是否已解锁密码区
    hideLocked: true,    // 未解锁时是否默认隐藏加密占位卡
    searchQuery: '',     // 搜索词
    activeTag: '',       // 当前选中的快捷分类标签（小写归一值）
    sortOrder: 'newest', // newest | oldest
    pageSize: CONFIG.DEFAULT_PAGE_SIZE,
    currentPage: 0,
    viewMode: 'grid',    // grid | list
    selectedKeys: {},    // 客户勾选的货品 key -> true
    lightboxList: [],    // 当前灯箱可浏览队列
    lightboxIndex: -1,
    lightboxZoomed: false
  };

  var gvizLoadGen_ = 0;
  var gvizTimer_ = null;
  var toastTimer_ = null;

  /* ==================== 数据连接（保留原 gviz JSONP） ==================== */
  function gvizUrl_() {
    return (
      'https://docs.google.com/spreadsheets/d/' +
      CONFIG.SPREADSHEET_ID +
      '/gviz/tq?tqx=out:json&gid=' +
      CONFIG.GID
    );
  }

  /** 动态 <script> 加载 gviz，绕过 file:// / 静态站的 CORS 限制 */
  function loadGvizViaScript_(url) {
    return new Promise(function (resolve, reject) {
      if (gvizTimer_) {
        clearTimeout(gvizTimer_);
        gvizTimer_ = null;
      }
      var myGen = ++gvizLoadGen_;
      var scriptEl = document.createElement('script');

      function done(err, data) {
        if (myGen !== gvizLoadGen_) return;
        if (gvizTimer_) {
          clearTimeout(gvizTimer_);
          gvizTimer_ = null;
        }
        if (scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
        if (err) reject(err);
        else resolve(data);
      }

      gvizTimer_ = setTimeout(function () {
        done(new Error('加载表格超时，请检查网络连接后点击右上角“刷新”重试。'));
      }, 25000);

      window.google = window.google || {};
      window.google.visualization = window.google.visualization || {};
      window.google.visualization.Query = window.google.visualization.Query || {};

      window.google.visualization.Query.setResponse = function (resp) {
        if (myGen !== gvizLoadGen_) return;
        try {
          if (resp && resp.status === 'error') {
            var msg =
              (resp.errors && resp.errors[0] && resp.errors[0].detailed_message) ||
              '表格查询出错';
            done(new Error(msg));
            return;
          }
          done(null, resp);
        } catch (e) {
          done(e);
        }
      };

      var sep = url.indexOf('?') >= 0 ? '&' : '?';
      scriptEl.src = url + sep + '_=' + Date.now();
      scriptEl.async = true;
      scriptEl.onerror = function () {
        done(
          new Error(
            '数据源加载失败：请确认表格已开启“知道链接的任何人均可查看”，并核对 news.js 中的 SPREADSHEET_ID / GID。'
          )
        );
      };
      document.head.appendChild(scriptEl);
    });
  }

  function cellValue_(cell) {
    if (!cell || cell.v == null) return '';
    if (typeof cell.v === 'object' && 'getTime' in Object(cell.v)) {
      try {
        return new Date(cell.v).toLocaleString('en-US');
      } catch (e) {
        return String(cell.f || cell.v);
      }
    }
    return String(cell.f != null ? cell.f : cell.v);
  }

  function isHeaderRow_(rawTime, rawText) {
    var a = String(rawTime || '').trim().toLowerCase();
    var b = String(rawText || '').trim().toLowerCase();
    if (a === 'time' && b === 'text') return true;
    if (rawTime === '时间' && rawText === '文案') return true;
    return false;
  }

  /** 健壮的时间解析，兼容 gviz Date(...)、Date 对象及美式日期字符串 */
  function parseTimestamp_(cell, displayStr) {
    if (cell && cell.v != null) {
      if (typeof cell.v === 'object' && typeof cell.v.getTime === 'function') {
        var msObj = cell.v.getTime();
        if (!isNaN(msObj)) return msObj;
      }
      if (typeof cell.v === 'string') {
        var dm = cell.v.match(
          /^Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+))?)?\s*\)$/
        );
        if (dm) {
          return new Date(
            Number(dm[1]),
            Number(dm[2]),
            Number(dm[3]),
            Number(dm[4] || 0),
            Number(dm[5] || 0),
            Number(dm[6] || 0)
          ).getTime();
        }
      }
    }

    var s = String(displayStr || '').trim();
    if (!s) return 0;

    // 显式匹配 M/D/YYYY H:mm:ss（Safari 稳妥解析）
    var us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (us) {
      return new Date(
        Number(us[3]),
        Number(us[1]) - 1,
        Number(us[2]),
        Number(us[4] || 0),
        Number(us[5] || 0),
        Number(us[6] || 0)
      ).getTime();
    }

    var parsed = Date.parse(s);
    return isNaN(parsed) ? 0 : parsed;
  }

  function pad2_(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDisplayTime_(ts, fallbackStr) {
    if (!ts) return String(fallbackStr || '—');
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(fallbackStr || '—');
    return (
      d.getFullYear() +
      '-' +
      pad2_(d.getMonth() + 1) +
      '-' +
      pad2_(d.getDate()) +
      ' ' +
      pad2_(d.getHours()) +
      ':' +
      pad2_(d.getMinutes())
    );
  }

  function formatShortDate_(ts, fallbackStr) {
    if (!ts) return String(fallbackStr || '');
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(fallbackStr || '');
    return pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()) + ' ' + pad2_(d.getHours()) + ':' + pad2_(d.getMinutes());
  }

  function hasTextIsTrue_(raw) {
    if (raw === true) return true;
    if (raw === false) return false;
    var s = String(raw || '').trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === '是';
  }

  function rowsFromGviz_(parsed) {
    var table = parsed && parsed.table;
    if (!table || !table.rows) return [];
    var items = [];

    table.rows.forEach(function (row, idx) {
      var c = row.c || [];
      var rawTime = cellValue_(c[0]);
      var rawText = cellValue_(c[1]);
      var rawLink = cellValue_(c[2]);
      var rawHasText = c[3] && c[3].v !== undefined ? c[3].v : cellValue_(c[3]);

      if (idx === 0 && isHeaderRow_(rawTime, rawText)) return;
      if (!rawTime && !rawText && !rawLink) return;

      var ts = parseTimestamp_(c[0], rawTime);
      var cleanLink = String(rawLink || '').trim();
      var cleanText = String(rawText || '').trim();
      var isPublic = hasTextIsTrue_(rawHasText);
      var key = [rawTime, cleanText, cleanLink, idx].join('|');

      items.push({
        key: key,
        timeRaw: rawTime,
        timeFormatted: formatDisplayTime_(ts, rawTime),
        timeShort: formatShortDate_(ts, rawTime),
        timestamp: ts,
        text: cleanText || '未命名货品',
        link: cleanLink,
        isPublic: isPublic,
        newestRank: 0
      });
    });

    // 按最新优先排序并打上全局最新名次（用于 NEW 徽标）
    items.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });
    items.forEach(function (item, i) {
      item.newestRank = i;
    });

    return items;
  }

  /* ==================== 图片 URL 工具 ==================== */
  function extractDriveId_(link) {
    if (!link) return '';
    var m1 = link.match(/\/file\/d\/([^/?#]+)/);
    if (m1) return m1[1];
    var m2 = link.match(/[?&]id=([^&#]+)/);
    if (m2) return m2[1];
    return '';
  }

  function getThumbUrl_(link, width) {
    if (!link) return '';
    var id = extractDriveId_(link);
    if (id) {
      return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (width || 600);
    }
    return link;
  }

  function isItemMasked_(item) {
    return !item.isPublic && !state.unlocked;
  }

  /* ==================== 筛选与动态标签 ==================== */
  function getTagCandidates_() {
    var map = {};
    state.allItems.forEach(function (item) {
      // 未解锁时绝对不统计加密项文案，避免泄露隐私信息
      if (isItemMasked_(item)) return;
      var raw = item.text.trim();
      if (!raw) return;
      var norm = raw.toLowerCase();
      if (!map[norm]) {
        map[norm] = { norm: norm, label: raw, count: 0 };
      }
      map[norm].count++;
    });

    var list = Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .filter(function (entry) {
        return entry.count >= 2;
      })
      .sort(function (a, b) {
        return b.count - a.count || a.label.localeCompare(b.label);
      });

    return list.slice(0, 10);
  }

  function getFilteredItems_() {
    var q = state.searchQuery.trim().toLowerCase();
    var tag = state.activeTag;
    var list = state.allItems.filter(function (item) {
      var masked = isItemMasked_(item);

      // 未解锁且开启“仅看公开货品”时过滤掉加密项
      if (masked && state.hideLocked) return false;

      // 标签筛选（加密项不可按真实文案命中）
      if (tag) {
        if (masked) return false;
        if (item.text.trim().toLowerCase() !== tag) return false;
      }

      // 关键词搜索（防止未解锁时匹配隐藏项真实文案）
      if (q) {
        if (masked) return false;
        var haystack = (item.text + ' ' + item.timeFormatted + ' ' + item.timeRaw).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      return true;
    });

    if (state.sortOrder === 'oldest') {
      list = list.slice().reverse();
    }
    return list;
  }

  /* ==================== UI 渲染辅助 ==================== */
  function showToast_(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    if (toastTimer_) clearTimeout(toastTimer_);
    toastTimer_ = setTimeout(function () {
      el.hidden = true;
    }, 2400);
  }

  function copyTextToClipboard_(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy_(text);
      });
    }
    return fallbackCopy_(text);
  }

  function fallbackCopy_(text) {
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('Copy command failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function attachResilientImage_(imgEl, mediaWrap, link, primarySize, fallbackSize) {
    var primaryUrl = getThumbUrl_(link, primarySize);
    var fallbackUrl = getThumbUrl_(link, fallbackSize);
    var triedFallback = false;

    imgEl.referrerPolicy = 'no-referrer';
    imgEl.decoding = 'async';
    imgEl.loading = 'lazy';
    imgEl.alt = '';

    imgEl.onload = function () {
      imgEl.classList.add('is-loaded');
      if (mediaWrap) mediaWrap.classList.remove('is-loading');
    };

    imgEl.onerror = function () {
      if (!triedFallback && fallbackUrl && fallbackUrl !== primaryUrl) {
        triedFallback = true;
        imgEl.src = fallbackUrl;
        return;
      }
      if (mediaWrap) mediaWrap.classList.remove('is-loading');
      imgEl.remove();
      if (mediaWrap) {
        var ph = document.createElement('div');
        ph.className = 'product-card__placeholder';
        ph.innerHTML = '<span>🖼️</span><span>点击“原图”查看</span>';
        mediaWrap.appendChild(ph);
      }
    };

    imgEl.src = primaryUrl;
  }

  /* ==================== 骨架屏 ==================== */
  function renderSkeletons_() {
    var feed = document.getElementById('feed');
    if (!feed) return;
    feed.className = 'catalog catalog--grid';
    feed.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 8; i++) {
      var card = document.createElement('div');
      card.className = 'skeleton-card';
      card.innerHTML =
        '<div class="skeleton-box skeleton-card__media"></div>' +
        '<div class="skeleton-card__body">' +
        '  <div class="skeleton-box skeleton-line"></div>' +
        '  <div class="skeleton-box skeleton-line skeleton-line--short"></div>' +
        '</div>';
      frag.appendChild(card);
    }
    feed.appendChild(frag);
  }

  /* ==================== 顶部状态与解锁控件更新 ==================== */
  function updateHeaderAndLockUi_() {
    var total = state.allItems.length;
    var publicCount = 0;
    var lockedCount = 0;
    state.allItems.forEach(function (item) {
      if (item.isPublic) publicCount++;
      else lockedCount++;
    });

    var statusEl = document.getElementById('status');
    if (statusEl) {
      if (total === 0) {
        statusEl.textContent = '暂无货品数据';
      } else if (lockedCount > 0 && !state.unlocked) {
        statusEl.textContent =
          '共 ' + total + ' 件货品 · 公开 ' + publicCount + ' 件 · 密码区 ' + lockedCount + ' 件';
      } else if (lockedCount > 0 && state.unlocked) {
        statusEl.textContent = '共 ' + total + ' 件货品 · 已解锁全部（含密码区 ' + lockedCount + ' 件）';
      } else {
        statusEl.textContent = '共 ' + total + ' 件货品 · 实时同步';
      }
    }

    var toggleBtn = document.getElementById('unlock-toggle-btn');
    var toggleLabel = document.getElementById('unlock-toggle-label');
    var hideLockedWrap = document.getElementById('hide-locked-wrap');
    var panel = document.getElementById('unlock-panel');

    if (toggleBtn && toggleLabel) {
      if (lockedCount === 0) {
        toggleBtn.hidden = true;
      } else if (state.unlocked) {
        toggleBtn.hidden = false;
        toggleBtn.classList.add('is-unlocked');
        toggleBtn.querySelector('.btn__icon').textContent = '🔓';
        toggleLabel.textContent = '已解锁全部';
      } else {
        toggleBtn.hidden = false;
        toggleBtn.classList.remove('is-unlocked');
        toggleBtn.querySelector('.btn__icon').textContent = '🔒';
        toggleLabel.textContent = '密码专区 (' + lockedCount + ')';
      }
    }

    if (hideLockedWrap) {
      hideLockedWrap.hidden = !(lockedCount > 0 && !state.unlocked);
    }

    if (panel && state.unlocked) {
      panel.hidden = true;
    }
  }

  /* ==================== 最新上架横向速览 ==================== */
  function renderLatestStrip_() {
    var section = document.getElementById('latest-section');
    var track = document.getElementById('latest-track');
    if (!section || !track) return;

    var latestVisible = state.allItems
      .filter(function (item) {
        return !isItemMasked_(item) && item.link;
      })
      .slice(0, 10);

    if (latestVisible.length === 0) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    track.innerHTML = '';
    var frag = document.createDocumentFragment();

    latestVisible.forEach(function (item, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'latest-card';
      btn.addEventListener('click', function () {
        openLightboxForItem_(item, latestVisible, idx);
      });

      var thumb = document.createElement('div');
      thumb.className = 'latest-card__thumb';
      var img = document.createElement('img');
      img.src = getThumbUrl_(item.link, 240);
      img.alt = item.text;
      img.referrerPolicy = 'no-referrer';
      img.loading = 'lazy';
      img.onerror = function () {
        this.style.display = 'none';
      };
      thumb.appendChild(img);

      var info = document.createElement('div');
      info.className = 'latest-card__info';

      var top = document.createElement('div');
      top.className = 'latest-card__top';
      if (item.newestRank < CONFIG.NEW_BADGE_COUNT) {
        var badge = document.createElement('span');
        badge.className = 'badge-new';
        badge.textContent = 'NEW';
        top.appendChild(badge);
      }
      var timeEl = document.createElement('span');
      timeEl.className = 'latest-card__time';
      timeEl.textContent = item.timeShort;
      top.appendChild(timeEl);

      var title = document.createElement('div');
      title.className = 'latest-card__title';
      title.textContent = item.text;

      info.appendChild(top);
      info.appendChild(title);
      btn.appendChild(thumb);
      btn.appendChild(info);
      frag.appendChild(btn);
    });

    track.appendChild(frag);
  }

  /* ==================== 动态分类标签栏 ==================== */
  function renderTagBar_() {
    var bar = document.getElementById('tag-bar');
    if (!bar) return;

    var tags = getTagCandidates_();
    // 如果当前选中的标签不再存在，重置
    if (
      state.activeTag &&
      !tags.some(function (t) {
        return t.norm === state.activeTag;
      })
    ) {
      state.activeTag = '';
    }

    bar.innerHTML = '';
    var frag = document.createDocumentFragment();

    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tag-pill' + (state.activeTag === '' ? ' is-active' : '');
    allBtn.textContent = '全部系列';
    allBtn.addEventListener('click', function () {
      state.activeTag = '';
      state.currentPage = 0;
      renderTagBar_();
      renderCatalog_();
    });
    frag.appendChild(allBtn);

    tags.forEach(function (t) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'tag-pill' + (state.activeTag === t.norm ? ' is-active' : '');
      pill.innerHTML =
        '<span>' + escapeHtml_(t.label) + '</span><span class="tag-pill__cnt">' + t.count + '</span>';
      pill.addEventListener('click', function () {
        state.activeTag = state.activeTag === t.norm ? '' : t.norm;
        state.currentPage = 0;
        renderTagBar_();
        renderCatalog_();
      });
      frag.appendChild(pill);
    });

    bar.appendChild(frag);
  }

  function escapeHtml_(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ==================== 单张货品卡片 ==================== */
  function buildProductCard_(item, viewableQueue) {
    var masked = isItemMasked_(item);
    var isSelected = !!state.selectedKeys[item.key];
    var isNew = item.newestRank < CONFIG.NEW_BADGE_COUNT;

    var card = document.createElement('article');
    card.className = 'product-card' + (masked ? ' product-card--locked' : '') + (isSelected ? ' is-selected' : '');

    // 图片展示区
    var media = document.createElement('div');
    media.className = 'product-card__media';

    // 左上角徽标（NEW / 密码区）
    var badges = document.createElement('div');
    badges.className = 'product-card__badges';
    if (isNew) {
      var newBadge = document.createElement('span');
      newBadge.className = 'badge-new';
      newBadge.textContent = 'NEW';
      badges.appendChild(newBadge);
    }
    if (!item.isPublic && state.unlocked) {
      var privBadge = document.createElement('span');
      privBadge.className = 'badge-private';
      privBadge.textContent = '密码区';
      badges.appendChild(privBadge);
    }
    if (badges.childNodes.length > 0) {
      media.appendChild(badges);
    }

    if (masked) {
      var lockVis = document.createElement('div');
      lockVis.className = 'locked-visual';
      lockVis.innerHTML =
        '<div class="locked-visual__icon" aria-hidden="true">🔒</div>' +
        '<div class="locked-visual__text">加密货品 · 点击输入密码解锁</div>';
      media.appendChild(lockVis);
      media.addEventListener('click', openUnlockDrawer_);
    } else {
      // 右上角选货按钮（网格模式）
      var selBtn = document.createElement('button');
      selBtn.type = 'button';
      selBtn.className = 'product-card__select' + (isSelected ? ' is-selected' : '');
      selBtn.title = isSelected ? '从看货清单移除' : '加入看货清单';
      selBtn.setAttribute('aria-label', selBtn.title);
      selBtn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      selBtn.textContent = isSelected ? '✓' : '＋';
      selBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSelectItem_(item.key);
      });
      media.appendChild(selBtn);

      if (item.link) {
        media.classList.add('is-loading');
        var img = document.createElement('img');
        img.className = 'product-card__img';
        attachResilientImage_(img, media, item.link, 600, 300);
        media.appendChild(img);

        var hint = document.createElement('span');
        hint.className = 'product-card__zoom-hint';
        hint.textContent = '🔍 点击放大看细节';
        media.appendChild(hint);

        media.addEventListener('click', function () {
          var qIdx = viewableQueue.indexOf(item);
          openLightboxForItem_(item, viewableQueue, qIdx >= 0 ? qIdx : 0);
        });
      } else {
        var noImg = document.createElement('div');
        noImg.className = 'product-card__placeholder';
        noImg.innerHTML = '<span>📦</span><span>暂无预览图</span>';
        media.appendChild(noImg);
      }
    }

    card.appendChild(media);

    // 卡片信息区
    var body = document.createElement('div');
    body.className = 'product-card__body';

    var infoWrap = document.createElement('div');
    infoWrap.className = 'product-card__info-wrap';

    var title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = masked ? '已隐藏货品（需输入密码）' : item.text;
    if (!masked) title.title = item.text;

    var meta = document.createElement('div');
    meta.className = 'product-card__meta';
    var timeSpan = document.createElement('span');
    timeSpan.textContent = masked ? '上架时间：--' : item.timeFormatted;
    meta.appendChild(timeSpan);

    infoWrap.appendChild(title);
    infoWrap.appendChild(meta);
    body.appendChild(infoWrap);

    // 卡片底部操作区
    var actions = document.createElement('div');
    actions.className = 'product-card__actions';

    if (masked) {
      var unlockAction = document.createElement('button');
      unlockAction.type = 'button';
      unlockAction.className = 'card-action-btn';
      unlockAction.textContent = '🔑 输入密码解锁';
      unlockAction.addEventListener('click', openUnlockDrawer_);
      actions.appendChild(unlockAction);
    } else {
      if (item.link) {
        var zoomBtn = document.createElement('button');
        zoomBtn.type = 'button';
        zoomBtn.className = 'card-action-btn';
        zoomBtn.textContent = '🔍 看大图';
        zoomBtn.addEventListener('click', function () {
          var qIdx = viewableQueue.indexOf(item);
          openLightboxForItem_(item, viewableQueue, qIdx >= 0 ? qIdx : 0);
        });
        actions.appendChild(zoomBtn);
      }

      // 列表模式专用选货按钮
      var listSelBtn = document.createElement('button');
      listSelBtn.type = 'button';
      listSelBtn.className = 'card-action-btn list-select-btn' + (isSelected ? ' is-selected' : '');
      listSelBtn.textContent = isSelected ? '✓ 已选' : '＋ 选货';
      listSelBtn.addEventListener('click', function () {
        toggleSelectItem_(item.key);
      });
      actions.appendChild(listSelBtn);

      if (item.link) {
        var driveLink = document.createElement('a');
        driveLink.className = 'card-action-link';
        driveLink.href = item.link;
        driveLink.target = '_blank';
        driveLink.rel = 'noopener';
        driveLink.textContent = '原图 ↗';
        actions.appendChild(driveLink);
      }
    }

    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  /* ==================== 主目录与分页渲染 ==================== */
  function renderCatalog_() {
    var feed = document.getElementById('feed');
    if (!feed) return;

    var filtered = getFilteredItems_();
    var viewableQueue = filtered.filter(function (item) {
      return !isItemMasked_(item) && item.link;
    });

    var total = filtered.length;
    var pageSize = state.pageSize;
    var totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    if (state.currentPage >= totalPages) {
      state.currentPage = Math.max(0, totalPages - 1);
    }

    var start = state.currentPage * pageSize;
    var pageSlice = filtered.slice(start, start + pageSize);

    feed.className = 'catalog ' + (state.viewMode === 'list' ? 'catalog--list' : 'catalog--grid');
    feed.innerHTML = '';

    if (pageSlice.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<div class="empty-state__icon">🔎</div>' +
        '<h3 class="empty-state__title">没有找到匹配的货品</h3>' +
        '<p class="empty-state__desc">可以尝试更换关键词、切换分类标签，或清除筛选条件。</p>';
      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn--primary';
      resetBtn.textContent = '重置全部筛选';
      resetBtn.addEventListener('click', resetFilters_);
      empty.appendChild(resetBtn);
      feed.appendChild(empty);
    } else {
      var frag = document.createDocumentFragment();
      pageSlice.forEach(function (item) {
        frag.appendChild(buildProductCard_(item, viewableQueue));
      });
      feed.appendChild(frag);
    }

    updateResultMeta_(total);
    renderPagination_(total, start, pageSlice.length, totalPages);
  }

  function updateResultMeta_(filteredTotal) {
    var el = document.getElementById('find-count');
    if (!el) return;
    if (state.allItems.length === 0) {
      el.textContent = '';
      return;
    }
    var parts = ['当前展示 ' + filteredTotal + ' 件'];
    if (state.searchQuery.trim()) parts.push('关键词“' + state.searchQuery.trim() + '”');
    if (state.activeTag) parts.push('系列已筛选');
    el.textContent = parts.join(' · ');
  }

  function renderPagination_(total, start, sliceLen, totalPages) {
    var nav = document.getElementById('pagination');
    var rangeEl = document.getElementById('page-range');
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    var numsWrap = document.getElementById('page-numbers');
    if (!nav || !prevBtn || !nextBtn || !numsWrap) return;

    if (total === 0 || totalPages <= 1) {
      nav.hidden = true;
      return;
    }

    nav.hidden = false;
    if (rangeEl) {
      rangeEl.textContent =
        '显示第 ' + (start + 1) + '–' + (start + sliceLen) + ' 件，共 ' + total + ' 件';
    }

    prevBtn.disabled = state.currentPage <= 0;
    nextBtn.disabled = state.currentPage >= totalPages - 1;

    numsWrap.innerHTML = '';
    var pages = buildPageList_(state.currentPage, totalPages);
    pages.forEach(function (p) {
      if (p === '...') {
        var sp = document.createElement('span');
        sp.className = 'page-ellipsis';
        sp.textContent = '…';
        numsWrap.appendChild(sp);
      } else {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'page-num' + (p === state.currentPage ? ' is-active' : '');
        btn.textContent = String(p + 1);
        btn.setAttribute('aria-label', '第 ' + (p + 1) + ' 页');
        btn.addEventListener('click', function () {
          goToPage_(p);
        });
        numsWrap.appendChild(btn);
      }
    });
  }

  function buildPageList_(cur, total) {
    if (total <= 7) {
      var arr = [];
      for (var i = 0; i < total; i++) arr.push(i);
      return arr;
    }
    var list = [0];
    if (cur > 2) list.push('...');
    var start = Math.max(1, cur - 1);
    var end = Math.min(total - 2, cur + 1);
    for (var j = start; j <= end; j++) list.push(j);
    if (cur < total - 3) list.push('...');
    list.push(total - 1);
    return list;
  }

  function goToPage_(pageIdx) {
    state.currentPage = pageIdx;
    renderCatalog_();
    var toolbar = document.querySelector('.toolbar');
    if (toolbar && toolbar.scrollIntoView) {
      toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function resetFilters_() {
    state.searchQuery = '';
    state.activeTag = '';
    state.currentPage = 0;
    var findInput = document.getElementById('find-input');
    var clearBtn = document.getElementById('find-clear');
    if (findInput) findInput.value = '';
    if (clearBtn) clearBtn.hidden = true;
    renderTagBar_();
    renderCatalog_();
  }

  /* ==================== 客户选货清单 ==================== */
  function getSelectedItems_() {
    return state.allItems.filter(function (item) {
      return !!state.selectedKeys[item.key] && !isItemMasked_(item);
    });
  }

  function toggleSelectItem_(key) {
    if (state.selectedKeys[key]) {
      delete state.selectedKeys[key];
    } else {
      state.selectedKeys[key] = true;
    }
    updateSelectionBar_();
    renderCatalog_();
    updateLightboxSelectionBtn_();
  }

  function clearSelection_() {
    state.selectedKeys = {};
    updateSelectionBar_();
    renderCatalog_();
    updateLightboxSelectionBtn_();
    closeSelectionModal_();
    showToast_('已清空选货清单');
  }

  function updateSelectionBar_() {
    var selected = getSelectedItems_();
    var bar = document.getElementById('selection-bar');
    var countEl = document.getElementById('selection-count');
    var thumbsEl = document.getElementById('selection-thumbs');
    if (!bar || !countEl || !thumbsEl) return;

    if (selected.length === 0) {
      bar.hidden = true;
      document.body.classList.remove('has-selection-bar');
      return;
    }

    bar.hidden = false;
    document.body.classList.add('has-selection-bar');
    countEl.textContent = '已选 ' + selected.length + ' 件货品';
    thumbsEl.innerHTML = '';

    selected.slice(0, 4).forEach(function (item) {
      if (!item.link) return;
      var img = document.createElement('img');
      img.className = 'selection-bar__thumb';
      img.src = getThumbUrl_(item.link, 120);
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      thumbsEl.appendChild(img);
    });
  }

  function formatInquiryText_(items) {
    var lines = ['【看货询价清单 · 共 ' + items.length + ' 件】'];
    items.forEach(function (item, idx) {
      lines.push(
        idx + 1 + '. ' + item.text + '（' + item.timeFormatted + '）' + (item.link ? '\n   ' + item.link : '')
      );
    });
    return lines.join('\n');
  }

  function copySelectedList_() {
    var selected = getSelectedItems_();
    if (selected.length === 0) {
      showToast_('请先勾选需要询价的货品');
      return;
    }
    copyTextToClipboard_(formatInquiryText_(selected))
      .then(function () {
        showToast_('已复制 ' + selected.length + ' 件货品清单，可直接粘贴发给客服');
      })
      .catch(function () {
        showToast_('复制失败，请点击“查看清单”手动复制');
      });
  }

  function openSelectionModal_() {
    var modal = document.getElementById('selection-modal');
    var listEl = document.getElementById('selection-modal-list');
    var badgeEl = document.getElementById('modal-sel-count');
    if (!modal || !listEl) return;

    var selected = getSelectedItems_();
    if (badgeEl) badgeEl.textContent = String(selected.length);
    listEl.innerHTML = '';

    if (selected.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:24px 0;">暂未勾选任何货品</p>';
    } else {
      selected.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'modal-item';

        if (item.link) {
          var img = document.createElement('img');
          img.className = 'modal-item__thumb';
          img.src = getThumbUrl_(item.link, 160);
          img.alt = '';
          img.referrerPolicy = 'no-referrer';
          row.appendChild(img);
        }

        var info = document.createElement('div');
        info.className = 'modal-item__info';
        info.innerHTML =
          '<div class="modal-item__title">' +
          escapeHtml_(item.text) +
          '</div>' +
          '<div class="modal-item__time">' +
          escapeHtml_(item.timeFormatted) +
          '</div>';
        row.appendChild(info);

        var rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'modal-item__remove';
        rmBtn.textContent = '移除';
        rmBtn.addEventListener('click', function () {
          delete state.selectedKeys[item.key];
          updateSelectionBar_();
          renderCatalog_();
          openSelectionModal_();
        });
        row.appendChild(rmBtn);

        listEl.appendChild(row);
      });
    }

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeSelectionModal_() {
    var modal = document.getElementById('selection-modal');
    if (modal) modal.hidden = true;
    var lb = document.getElementById('lightbox');
    if (!lb || lb.hidden) {
      document.body.classList.remove('modal-open');
    }
  }

  /* ==================== 高清大图灯箱 Lightbox ==================== */
  function openLightboxForItem_(item, queue, index) {
    if (!item || !item.link || isItemMasked_(item)) return;
    state.lightboxList = queue && queue.length ? queue : [item];
    state.lightboxIndex = index >= 0 && index < state.lightboxList.length ? index : 0;
    state.lightboxZoomed = false;

    var lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.hidden = false;
    document.body.classList.add('modal-open');
    renderLightboxCurrent_();
  }

  function closeLightbox_() {
    var lb = document.getElementById('lightbox');
    if (lb) lb.hidden = true;
    state.lightboxZoomed = false;
    var media = document.getElementById('lb-media');
    if (media) media.classList.remove('is-zoomed');
    var modal = document.getElementById('selection-modal');
    if (!modal || modal.hidden) {
      document.body.classList.remove('modal-open');
    }
  }

  function setLightboxZoom_(zoomed) {
    state.lightboxZoomed = zoomed;
    var media = document.getElementById('lb-media');
    var zoomBtn = document.getElementById('lb-zoom-btn');
    if (media) media.classList.toggle('is-zoomed', zoomed);
    if (zoomBtn) zoomBtn.textContent = zoomed ? '🔍 还原' : '🔍 放大';
  }

  function updateLightboxSelectionBtn_() {
    var btn = document.getElementById('lb-select-btn');
    if (!btn || state.lightboxIndex < 0) return;
    var item = state.lightboxList[state.lightboxIndex];
    if (!item) return;
    var selected = !!state.selectedKeys[item.key];
    btn.classList.toggle('is-selected', selected);
    btn.textContent = selected ? '✓ 已加入清单' : '＋ 加入选货';
  }

  function preloadLightboxNeighbors_(idx) {
    [-1, 1].forEach(function (delta) {
      var neighbor = state.lightboxList[idx + delta];
      if (neighbor && neighbor.link) {
        var pre = new Image();
        pre.referrerPolicy = 'no-referrer';
        pre.src = getThumbUrl_(neighbor.link, 1600);
      }
    });
  }

  function renderLightboxCurrent_() {
    var item = state.lightboxList[state.lightboxIndex];
    if (!item) return;

    setLightboxZoom_(false);

    var counter = document.getElementById('lb-counter');
    var titleEl = document.getElementById('lb-title');
    var timeEl = document.getElementById('lb-time');
    var newBadge = document.getElementById('lb-new-badge');
    var driveLink = document.getElementById('lb-drive-link');
    var prevBtn = document.getElementById('lb-prev-btn');
    var nextBtn = document.getElementById('lb-next-btn');
    var imgEl = document.getElementById('lb-img');
    var spinner = document.getElementById('lb-spinner');

    if (counter) counter.textContent = state.lightboxIndex + 1 + ' / ' + state.lightboxList.length;
    if (titleEl) titleEl.textContent = item.text;
    if (timeEl) timeEl.textContent = '上架时间：' + item.timeFormatted;
    if (newBadge) newBadge.hidden = !(item.newestRank < CONFIG.NEW_BADGE_COUNT);
    if (driveLink) driveLink.href = item.link;
    if (prevBtn) prevBtn.disabled = state.lightboxIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.lightboxIndex >= state.lightboxList.length - 1;

    updateLightboxSelectionBtn_();

    // 先展示已缓存的 600px 预览图做到零白屏，同时加载 1600px 高清大图无缝替换
    if (imgEl && spinner) {
      var previewUrl = getThumbUrl_(item.link, 600);
      var hiResUrl = getThumbUrl_(item.link, 1600);
      var currentKey = item.key;

      imgEl.src = previewUrl;
      imgEl.alt = item.text;
      spinner.hidden = false;

      var hiImg = new Image();
      hiImg.referrerPolicy = 'no-referrer';
      hiImg.onload = function () {
        var cur = state.lightboxList[state.lightboxIndex];
        if (cur && cur.key === currentKey) {
          imgEl.src = hiResUrl;
          spinner.hidden = true;
        }
      };
      hiImg.onerror = function () {
        spinner.hidden = true;
      };
      hiImg.src = hiResUrl;
    }

    preloadLightboxNeighbors_(state.lightboxIndex);
  }

  function stepLightbox_(delta) {
    var next = state.lightboxIndex + delta;
    if (next < 0 || next >= state.lightboxList.length) return;
    state.lightboxIndex = next;
    renderLightboxCurrent_();
  }

  /* ==================== 密码解锁交互 ==================== */
  function openUnlockDrawer_() {
    if (state.unlocked) return;
    var panel = document.getElementById('unlock-panel');
    var input = document.getElementById('unlock-pw');
    if (!panel) return;
    panel.hidden = false;
    if (input) {
      input.focus();
      input.select();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function tryUnlock_() {
    var input = document.getElementById('unlock-pw');
    var err = document.getElementById('unlock-err');
    if (!input) return;
    if (err) err.textContent = '';

    if (input.value.trim() === CONFIG.UNLOCK_PASS) {
      state.unlocked = true;
      state.hideLocked = false;
      input.value = '';
      var panel = document.getElementById('unlock-panel');
      if (panel) panel.hidden = true;
      renderAll_();
      showToast_('已解锁全部密码专区货品');
    } else if (err) {
      err.textContent = '密码不正确，请重新输入';
      input.focus();
      input.select();
    }
  }

  /* ==================== 主题切换 ==================== */
  function initTheme_() {
    var saved = '';
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) || '';
    } catch (e) {}
    var theme = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }

  function toggleTheme_() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {}
  }

  /* ==================== 错误提示与数据拉取 ==================== */
  function showError_(msg) {
    var el = document.getElementById('error');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
  }

  function clearError_() {
    var el = document.getElementById('error');
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function renderAll_() {
    updateHeaderAndLockUi_();
    renderLatestStrip_();
    renderTagBar_();
    renderCatalog_();
    updateSelectionBar_();
  }

  function loadData_(isManualRefresh) {
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      var st = document.getElementById('status');
      if (st) st.textContent = '请先在 news.js 中配置 SPREADSHEET_ID';
      showError_('未配置数据源：请在 news.js 顶部设置 CONFIG.SPREADSHEET_ID 与 CONFIG.GID。');
      return;
    }

    clearError_();
    var refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('is-spinning');
    }

    if (state.allItems.length === 0) {
      renderSkeletons_();
    }

    loadGvizViaScript_(gvizUrl_())
      .then(function (parsed) {
        state.allItems = rowsFromGviz_(parsed);
        state.currentPage = 0;
        renderAll_();
        if (isManualRefresh) {
          showToast_('已同步最新货品，共 ' + state.allItems.length + ' 件');
        }
      })
      .catch(function (e) {
        var st = document.getElementById('status');
        if (st) st.textContent = '数据同步失败';
        showError_(String((e && e.message) || e));
        if (state.allItems.length === 0) {
          var feed = document.getElementById('feed');
          if (feed) feed.innerHTML = '';
        }
      })
      .finally(function () {
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('is-spinning');
        }
      });
  }

  /* ==================== 事件绑定 ==================== */
  function bindEvents_() {
    // 主题切换
    var themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme_);

    // 刷新数据
    var refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        loadData_(true);
      });
    }

    // 密码抽屉开关与提交
    var unlockToggle = document.getElementById('unlock-toggle-btn');
    var unlockPanel = document.getElementById('unlock-panel');
    var unlockClose = document.getElementById('unlock-close-btn');
    var unlockBtn = document.getElementById('unlock-btn');
    var unlockInput = document.getElementById('unlock-pw');

    if (unlockToggle && unlockPanel) {
      unlockToggle.addEventListener('click', function () {
        if (state.unlocked) return;
        unlockPanel.hidden = !unlockPanel.hidden;
        if (!unlockPanel.hidden && unlockInput) unlockInput.focus();
      });
    }
    if (unlockClose && unlockPanel) {
      unlockClose.addEventListener('click', function () {
        unlockPanel.hidden = true;
      });
    }
    if (unlockBtn) unlockBtn.addEventListener('click', tryUnlock_);
    if (unlockInput) {
      unlockInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') tryUnlock_();
      });
    }

    // 最新上架条左右滚动
    var latestTrack = document.getElementById('latest-track');
    var latestPrev = document.getElementById('latest-prev');
    var latestNext = document.getElementById('latest-next');
    if (latestTrack && latestPrev && latestNext) {
      latestPrev.addEventListener('click', function () {
        latestTrack.scrollBy({ left: -340, behavior: 'smooth' });
      });
      latestNext.addEventListener('click', function () {
        latestTrack.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }

    // 搜索框
    var findInput = document.getElementById('find-input');
    var findClear = document.getElementById('find-clear');
    var searchTimer = null;

    function applySearch() {
      state.searchQuery = findInput ? findInput.value : '';
      state.currentPage = 0;
      if (findClear) findClear.hidden = !state.searchQuery;
      renderCatalog_();
    }

    if (findInput) {
      findInput.addEventListener('input', function () {
        if (findClear) findClear.hidden = !findInput.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(applySearch, 180);
      });
      findInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          clearTimeout(searchTimer);
          applySearch();
        }
      });
    }
    if (findClear) {
      findClear.addEventListener('click', function () {
        if (findInput) {
          findInput.value = '';
          findInput.focus();
        }
        applySearch();
      });
    }

    // 仅看公开货品开关
    var hideLockedToggle = document.getElementById('hide-locked-toggle');
    if (hideLockedToggle) {
      hideLockedToggle.checked = state.hideLocked;
      hideLockedToggle.addEventListener('change', function () {
        state.hideLocked = hideLockedToggle.checked;
        state.currentPage = 0;
        renderCatalog_();
      });
    }

    // 排序 & 每页数量
    var sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        state.sortOrder = sortSelect.value;
        state.currentPage = 0;
        renderCatalog_();
      });
    }

    var pageSizeSelect = document.getElementById('pagesize-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', function () {
        state.pageSize = Number(pageSizeSelect.value) || CONFIG.DEFAULT_PAGE_SIZE;
        state.currentPage = 0;
        renderCatalog_();
      });
    }

    // 网格 / 列表视图切换
    var gridBtn = document.getElementById('view-grid-btn');
    var listBtn = document.getElementById('view-list-btn');
    function setViewMode(mode) {
      state.viewMode = mode;
      if (gridBtn) {
        gridBtn.classList.toggle('is-active', mode === 'grid');
        gridBtn.setAttribute('aria-pressed', mode === 'grid' ? 'true' : 'false');
      }
      if (listBtn) {
        listBtn.classList.toggle('is-active', mode === 'list');
        listBtn.setAttribute('aria-pressed', mode === 'list' ? 'true' : 'false');
      }
      renderCatalog_();
    }
    if (gridBtn) gridBtn.addEventListener('click', function () { setViewMode('grid'); });
    if (listBtn) listBtn.addEventListener('click', function () { setViewMode('list'); });

    // 分页上下页
    var prevPage = document.getElementById('page-prev');
    var nextPage = document.getElementById('page-next');
    if (prevPage) {
      prevPage.addEventListener('click', function () {
        if (state.currentPage > 0) goToPage_(state.currentPage - 1);
      });
    }
    if (nextPage) {
      nextPage.addEventListener('click', function () {
        goToPage_(state.currentPage + 1);
      });
    }

    // 选货浮动条 & 弹窗按钮
    var selViewBtn = document.getElementById('selection-view-btn');
    var selCopyBtn = document.getElementById('selection-copy-btn');
    var selClearBtn = document.getElementById('selection-clear-btn');
    var modalCopyBtn = document.getElementById('modal-copy-btn');
    var modalClearBtn = document.getElementById('modal-clear-btn');

    if (selViewBtn) selViewBtn.addEventListener('click', openSelectionModal_);
    if (selCopyBtn) selCopyBtn.addEventListener('click', copySelectedList_);
    if (selClearBtn) selClearBtn.addEventListener('click', clearSelection_);
    if (modalCopyBtn) modalCopyBtn.addEventListener('click', copySelectedList_);
    if (modalClearBtn) modalClearBtn.addEventListener('click', clearSelection_);

    document.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeSelectionModal_);
    });

    // 灯箱交互
    var lbCloseBtn = document.getElementById('lb-close-btn');
    var lbPrevBtn = document.getElementById('lb-prev-btn');
    var lbNextBtn = document.getElementById('lb-next-btn');
    var lbZoomBtn = document.getElementById('lb-zoom-btn');
    var lbImg = document.getElementById('lb-img');
    var lbSelectBtn = document.getElementById('lb-select-btn');
    var lbCopyBtn = document.getElementById('lb-copy-btn');
    var lbStage = document.getElementById('lb-stage');

    if (lbCloseBtn) lbCloseBtn.addEventListener('click', closeLightbox_);
    document.querySelectorAll('[data-lb-close]').forEach(function (el) {
      el.addEventListener('click', closeLightbox_);
    });
    if (lbPrevBtn) lbPrevBtn.addEventListener('click', function () { stepLightbox_(-1); });
    if (lbNextBtn) lbNextBtn.addEventListener('click', function () { stepLightbox_(1); });
    if (lbZoomBtn) {
      lbZoomBtn.addEventListener('click', function () {
        setLightboxZoom_(!state.lightboxZoomed);
      });
    }
    if (lbImg) {
      lbImg.addEventListener('click', function () {
        setLightboxZoom_(!state.lightboxZoomed);
      });
    }
    if (lbSelectBtn) {
      lbSelectBtn.addEventListener('click', function () {
        var cur = state.lightboxList[state.lightboxIndex];
        if (cur) toggleSelectItem_(cur.key);
      });
    }
    if (lbCopyBtn) {
      lbCopyBtn.addEventListener('click', function () {
        var cur = state.lightboxList[state.lightboxIndex];
        if (!cur) return;
        var text = cur.text + '（' + cur.timeFormatted + '）\n' + (cur.link || '');
        copyTextToClipboard_(text)
          .then(function () { showToast_('已复制该货品信息'); })
          .catch(function () { showToast_('复制失败'); });
      });
    }

    // 灯箱触摸左右滑切图
    if (lbStage) {
      var touchStartX = 0;
      var touchStartY = 0;
      lbStage.addEventListener(
        'touchstart',
        function (ev) {
          if (state.lightboxZoomed || !ev.touches || ev.touches.length !== 1) return;
          touchStartX = ev.touches[0].clientX;
          touchStartY = ev.touches[0].clientY;
        },
        { passive: true }
      );
      lbStage.addEventListener(
        'touchend',
        function (ev) {
          if (state.lightboxZoomed || !ev.changedTouches || ev.changedTouches.length !== 1) return;
          var dx = ev.changedTouches[0].clientX - touchStartX;
          var dy = ev.changedTouches[0].clientY - touchStartY;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            stepLightbox_(dx < 0 ? 1 : -1);
          }
        },
        { passive: true }
      );
    }

    // 全局快捷键（灯箱与弹窗）
    document.addEventListener('keydown', function (ev) {
      var lb = document.getElementById('lightbox');
      var modal = document.getElementById('selection-modal');
      if (lb && !lb.hidden) {
        if (ev.key === 'Escape') closeLightbox_();
        else if (ev.key === 'ArrowLeft') stepLightbox_(-1);
        else if (ev.key === 'ArrowRight') stepLightbox_(1);
      } else if (modal && !modal.hidden) {
        if (ev.key === 'Escape') closeSelectionModal_();
      }
    });
  }

  /* ==================== 初始化入口 ==================== */
  initTheme_();
  bindEvents_();
  loadData_(false);
})();
