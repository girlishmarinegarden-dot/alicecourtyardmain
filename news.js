/**
 * Product Catalog — Mobile-First & English Default
 * Keeps the original Google Sheets Visualization API (gviz/tq) JSONP connection
 * so it works directly via file:// or any static hosting with zero CORS issues.
 */
(function () {
  'use strict';

  var CONFIG = {
    SPREADSHEET_ID: '1WFuFX7jVCV0ZVm5HBsHbMB8qOew2wVhnL8tNzWsjss4',
    GID: '0',
    /** Show NEW badge on the newest N items */
    NEW_BADGE_COUNT: 3,
    /** Default items per page */
    DEFAULT_PAGE_SIZE: 20,
    /** Password for hasText=false private rows (session-only, resets on reload) */
    UNLOCK_PASS: 'alicecourtyardr18',
    /** Default UI language: 'en' | 'zh' */
    DEFAULT_LANG: 'en'
  };

  var THEME_STORAGE_KEY = 'CatalogTheme_Pref';
  var LANG_STORAGE_KEY = 'CatalogLang_Pref';

  /* ==================== i18n Dictionary (English Default) ==================== */
  var I18N = {
    en: {
      docTitle: 'Product Catalog',
      brandTitle: 'Catalog',
      langSwitch: '中文',
      loading: 'Loading catalog…',
      noItems: 'No items yet',
      statusPublicAndLocked: function (pub, locked) {
        return pub + ' public · ' + locked + ' VIP';
      },
      statusAllUnlocked: function (total, locked) {
        return total + ' items · ' + locked + ' VIP unlocked';
      },
      statusTotal: function (total) {
        return total + (total === 1 ? ' item' : ' items') + ' · live';
      },
      vipBtn: function (locked) {
        return 'VIP (' + locked + ')';
      },
      vipUnlocked: 'Unlocked',
      unlockBadge: 'VIP Area',
      unlockHint: 'Enter password to view private items (this session only).',
      unlockPlaceholder: 'Enter password…',
      unlockAction: 'Unlock',
      close: 'Close',
      wrongPass: 'Wrong password. Please try again.',
      unlockedToast: 'All VIP items unlocked',
      latestHeading: 'New Arrivals',
      latestSub: 'Tap to zoom',
      searchPlaceholder: 'Search items, series, or date…',
      publicOnly: 'Public only',
      sortNewest: 'Newest',
      sortOldest: 'Oldest',
      perPage20: '20 / page',
      perPage40: '40 / page',
      showAll: 'Show all',
      allSeries: 'All',
      showingCount: function (n) {
        return n + (n === 1 ? ' item' : ' items');
      },
      searchTag: function (q) {
        return '“' + q + '”';
      },
      seriesFiltered: 'Filtered',
      privateBadge: 'VIP',
      lockedCardText: 'VIP item · Tap to unlock',
      lockedCardTitle: 'Private item (password required)',
      lockedTime: 'Date: --',
      unlockCardBtn: '🔑 Unlock',
      zoomHint: '🔍 Tap to zoom',
      zoomBtn: '🔍 Zoom',
      zoomOutBtn: '🔍 Reset',
      originalLink: 'Original ↗',
      driveFallback: 'Tap "Original" to view',
      noPreview: 'No preview',
      untitled: 'Untitled item',
      selectAdd: '＋ Select',
      selectAdded: '✓ Selected',
      selectShortAdd: '＋ Pick',
      selectShortAdded: '✓ Picked',
      addTitle: 'Add to inquiry list',
      removeTitle: 'Remove from inquiry list',
      emptyTitle: 'No matching items',
      emptyDesc: 'Try another keyword, switch category, or reset filters.',
      resetFilters: 'Reset filters',
      pageRange: function (s, e, total) {
        return 'Showing ' + s + '–' + e + ' of ' + total;
      },
      prev: '‹ Prev',
      next: 'Next ›',
      footerTip: 'Tap any photo for HD zoom · Tap ＋ to build an inquiry list',
      selectedCount: function (n) {
        return n + ' selected';
      },
      viewList: 'View',
      copyList: 'Copy List',
      modalTitle: 'Selected Items',
      modalEmpty: 'No items selected yet.',
      clearAll: 'Clear All',
      copyInquiryBtn: 'Copy Inquiry List',
      removeBtn: 'Remove',
      clearedToast: 'Selection cleared',
      pickFirstToast: 'Select items first',
      copiedListToast: function (n) {
        return 'Copied ' + n + (n === 1 ? ' item' : ' items') + ' to clipboard';
      },
      copiedItemToast: 'Item info copied',
      copyFailedToast: 'Copy failed — open "View" to copy manually',
      copyBtn: 'Copy',
      lbPosted: function (t) {
        return 'Added: ' + t;
      },
      syncedToast: function (total) {
        return 'Synced ' + total + ' items';
      },
      syncFailed: 'Failed to load',
      timeoutErr: 'Request timed out. Check your connection and tap Refresh.',
      loadErr: 'Failed to load sheet. Ensure sharing is set to "Anyone with the link can view" and verify SPREADSHEET_ID / GID.',
      configErr: 'Spreadsheet not configured: set CONFIG.SPREADSHEET_ID and GID in news.js.',
      inquiryHeader: function (n) {
        return '[Inquiry List · ' + n + (n === 1 ? ' item' : ' items') + ']';
      }
    },
    zh: {
      docTitle: '货品图录 · Catalog',
      brandTitle: '货品图录',
      langSwitch: 'EN',
      loading: '正在同步最新货品…',
      noItems: '暂无货品数据',
      statusPublicAndLocked: function (pub, locked) {
        return '公开 ' + pub + ' 件 · 密码区 ' + locked + ' 件';
      },
      statusAllUnlocked: function (total, locked) {
        return '共 ' + total + ' 件 · 已解锁 ' + locked + ' 件密码区';
      },
      statusTotal: function (total) {
        return '共 ' + total + ' 件货品 · 实时同步';
      },
      vipBtn: function (locked) {
        return '密码区 (' + locked + ')';
      },
      vipUnlocked: '已解锁',
      unlockBadge: '密码专区',
      unlockHint: '输入密码查看私密货品（仅本次浏览有效，刷新后重新锁定）。',
      unlockPlaceholder: '请输入访问密码…',
      unlockAction: '解锁',
      close: '收起',
      wrongPass: '密码不正确，请重新输入',
      unlockedToast: '已解锁全部密码专区货品',
      latestHeading: '最新上架',
      latestSub: '点击放大',
      searchPlaceholder: '搜索货品名称、系列或日期…',
      publicOnly: '仅公开',
      sortNewest: '最新上架',
      sortOldest: '最早优先',
      perPage20: '20 件/页',
      perPage40: '40 件/页',
      showAll: '显示全部',
      allSeries: '全部',
      showingCount: function (n) {
        return '展示 ' + n + ' 件';
      },
      searchTag: function (q) {
        return '“' + q + '”';
      },
      seriesFiltered: '已筛选',
      privateBadge: '密码区',
      lockedCardText: '加密货品 · 点击解锁',
      lockedCardTitle: '已隐藏货品（需输入密码）',
      lockedTime: '时间：--',
      unlockCardBtn: '🔑 解锁',
      zoomHint: '🔍 点击看大图',
      zoomBtn: '🔍 放大',
      zoomOutBtn: '🔍 还原',
      originalLink: '原图 ↗',
      driveFallback: '点击“原图”查看',
      noPreview: '暂无预览图',
      untitled: '未命名货品',
      selectAdd: '＋ 加入选货',
      selectAdded: '✓ 已加入清单',
      selectShortAdd: '＋ 选货',
      selectShortAdded: '✓ 已选',
      addTitle: '加入选货清单',
      removeTitle: '移出选货清单',
      emptyTitle: '没有找到匹配的货品',
      emptyDesc: '可以更换关键词、切换系列标签或重置筛选。',
      resetFilters: '重置筛选',
      pageRange: function (s, e, total) {
        return '第 ' + s + '–' + e + ' 件，共 ' + total + ' 件';
      },
      prev: '‹ 上一页',
      next: '下一页 ›',
      footerTip: '点击图片高清放大 · 点右上角 ＋ 整理询价清单',
      selectedCount: function (n) {
        return '已选 ' + n + ' 件';
      },
      viewList: '查看',
      copyList: '复制清单',
      modalTitle: '已选货品清单',
      modalEmpty: '暂未勾选任何货品',
      clearAll: '清空全部',
      copyInquiryBtn: '一键复制发客服',
      removeBtn: '移除',
      clearedToast: '已清空选货清单',
      pickFirstToast: '请先勾选货品',
      copiedListToast: function (n) {
        return '已复制 ' + n + ' 件货品清单，可直接发给客服';
      },
      copiedItemToast: '已复制该货品信息',
      copyFailedToast: '复制失败，请点“查看”手动复制',
      copyBtn: '复制',
      lbPosted: function (t) {
        return '上架时间：' + t;
      },
      syncedToast: function (total) {
        return '已同步最新 ' + total + ' 件货品';
      },
      syncFailed: '加载失败',
      timeoutErr: '加载表格超时，请检查网络后点击刷新重试。',
      loadErr: '数据源加载失败：请确认表格已开启“知道链接的任何人均可查看”并核对 SPREADSHEET_ID / GID。',
      configErr: '未配置数据源：请在 news.js 顶部填写 CONFIG.SPREADSHEET_ID 与 GID。',
      inquiryHeader: function (n) {
        return '【看货询价清单 · 共 ' + n + ' 件】';
      }
    }
  };

  /* ==================== App State ==================== */
  var state = {
    lang: CONFIG.DEFAULT_LANG,
    allItems: [],
    unlocked: false,
    hideLocked: true,
    searchQuery: '',
    activeTag: '',
    sortOrder: 'newest',
    pageSize: CONFIG.DEFAULT_PAGE_SIZE,
    currentPage: 0,
    viewMode: 'grid', // 'grid' | 'large' | 'list'
    selectedKeys: {},
    lightboxList: [],
    lightboxIndex: -1,
    lightboxZoomed: false
  };

  var gvizLoadGen_ = 0;
  var gvizTimer_ = null;
  var toastTimer_ = null;

  function t_(key) {
    var dict = I18N[state.lang] || I18N.en;
    return dict[key] !== undefined ? dict[key] : I18N.en[key];
  }

  /* ==================== Data Connection (Original gviz JSONP) ==================== */
  function gvizUrl_() {
    return (
      'https://docs.google.com/spreadsheets/d/' +
      CONFIG.SPREADSHEET_ID +
      '/gviz/tq?tqx=out:json&gid=' +
      CONFIG.GID
    );
  }

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
        done(new Error(t_('timeoutErr')));
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
              'Sheet query error';
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
        done(new Error(t_('loadErr')));
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
        text: cleanText,
        link: cleanLink,
        isPublic: isPublic,
        newestRank: 0
      });
    });

    items.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });
    items.forEach(function (item, i) {
      item.newestRank = i;
    });

    return items;
  }

  /* ==================== Image URL Helpers ==================== */
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

  function getItemTitle_(item) {
    return item.text || t_('untitled');
  }

  /* ==================== Filtering & Dynamic Series Pills ==================== */
  function getTagCandidates_() {
    var map = {};
    state.allItems.forEach(function (item) {
      if (isItemMasked_(item)) return;
      var raw = item.text.trim();
      if (!raw) return;
      var norm = raw.toLowerCase();
      if (!map[norm]) {
        map[norm] = { norm: norm, label: raw, count: 0 };
      }
      map[norm].count++;
    });

    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .filter(function (entry) {
        return entry.count >= 2;
      })
      .sort(function (a, b) {
        return b.count - a.count || a.label.localeCompare(b.label);
      })
      .slice(0, 10);
  }

  function getFilteredItems_() {
    var q = state.searchQuery.trim().toLowerCase();
    var tag = state.activeTag;
    var list = state.allItems.filter(function (item) {
      var masked = isItemMasked_(item);

      if (masked && state.hideLocked) return false;

      if (tag) {
        if (masked) return false;
        if (item.text.trim().toLowerCase() !== tag) return false;
      }

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

  /* ==================== Static Language Application ==================== */
  function applyStaticTranslations_() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t_('docTitle');

    setText_('brand-title', t_('brandTitle'));
    setText_('lang-toggle-btn', t_('langSwitch'));
    setText_('unlock-badge', t_('unlockBadge'));
    setText_('unlock-hint', t_('unlockHint'));
    setText_('unlock-btn', t_('unlockAction'));
    setText_('unlock-close-btn', t_('close'));
    setText_('latest-heading', t_('latestHeading'));
    setText_('latest-sub', t_('latestSub'));
    setText_('hide-locked-label', t_('publicOnly'));
    setText_('page-prev', t_('prev'));
    setText_('page-next', t_('next'));
    setText_('footer-tip', t_('footerTip'));
    setText_('selection-view-btn', t_('viewList'));
    setText_('selection-copy-btn', t_('copyList'));
    setText_('modal-title-text', t_('modalTitle'));
    setText_('modal-clear-btn', t_('clearAll'));
    setText_('modal-copy-btn', t_('copyInquiryBtn'));
    setText_('lb-copy-btn', t_('copyBtn'));
    setText_('lb-drive-link', t_('originalLink'));

    var unlockPw = document.getElementById('unlock-pw');
    if (unlockPw) unlockPw.placeholder = t_('unlockPlaceholder');

    var findInput = document.getElementById('find-input');
    if (findInput) findInput.placeholder = t_('searchPlaceholder');

    var sortSelect = document.getElementById('sort-select');
    if (sortSelect && sortSelect.options.length >= 2) {
      sortSelect.options[0].textContent = t_('sortNewest');
      sortSelect.options[1].textContent = t_('sortOldest');
    }

    var pageSizeSelect = document.getElementById('pagesize-select');
    if (pageSizeSelect && pageSizeSelect.options.length >= 3) {
      pageSizeSelect.options[0].textContent = t_('perPage20');
      pageSizeSelect.options[1].textContent = t_('perPage40');
      pageSizeSelect.options[2].textContent = t_('showAll');
    }

    setLightboxZoom_(state.lightboxZoomed);
  }

  function setText_(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ==================== Utilities ==================== */
  function escapeHtml_(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

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
        ph.innerHTML = '<span>🖼️</span><span>' + escapeHtml_(t_('driveFallback')) + '</span>';
        mediaWrap.appendChild(ph);
      }
    };

    imgEl.src = primaryUrl;
  }

  /* ==================== Skeletons ==================== */
  function renderSkeletons_() {
    var feed = document.getElementById('feed');
    if (!feed) return;
    feed.className = 'catalog catalog--grid';
    feed.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 6; i++) {
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

  /* ==================== Header & Lock Status ==================== */
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
        statusEl.textContent = t_('noItems');
      } else if (lockedCount > 0 && !state.unlocked) {
        statusEl.textContent = t_('statusPublicAndLocked')(publicCount, lockedCount);
      } else if (lockedCount > 0 && state.unlocked) {
        statusEl.textContent = t_('statusAllUnlocked')(total, lockedCount);
      } else {
        statusEl.textContent = t_('statusTotal')(total);
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
        toggleLabel.textContent = t_('vipUnlocked');
      } else {
        toggleBtn.hidden = false;
        toggleBtn.classList.remove('is-unlocked');
        toggleBtn.querySelector('.btn__icon').textContent = '🔒';
        toggleLabel.textContent = t_('vipBtn')(lockedCount);
      }
    }

    if (hideLockedWrap) {
      hideLockedWrap.hidden = !(lockedCount > 0 && !state.unlocked);
    }

    if (panel && state.unlocked) {
      panel.hidden = true;
    }
  }

  /* ==================== New Arrivals Rail ==================== */
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
      img.alt = getItemTitle_(item);
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
      title.textContent = getItemTitle_(item);

      info.appendChild(top);
      info.appendChild(title);
      btn.appendChild(thumb);
      btn.appendChild(info);
      frag.appendChild(btn);
    });

    track.appendChild(frag);
  }

  /* ==================== Dynamic Category Pills ==================== */
  function renderTagBar_() {
    var bar = document.getElementById('tag-bar');
    if (!bar) return;

    var tags = getTagCandidates_();
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
    allBtn.textContent = t_('allSeries');
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

  /* ==================== Product Card Builder ==================== */
  function buildProductCard_(item, viewableQueue) {
    var masked = isItemMasked_(item);
    var isSelected = !!state.selectedKeys[item.key];
    var isNew = item.newestRank < CONFIG.NEW_BADGE_COUNT;
    var primaryThumbSize = state.viewMode === 'large' ? 800 : 600;

    var card = document.createElement('article');
    card.className =
      'product-card' +
      (masked ? ' product-card--locked' : '') +
      (isSelected ? ' is-selected' : '');

    // Media area
    var media = document.createElement('div');
    media.className = 'product-card__media';

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
      privBadge.textContent = t_('privateBadge');
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
        '<div class="locked-visual__text">' +
        escapeHtml_(t_('lockedCardText')) +
        '</div>';
      media.appendChild(lockVis);
      media.addEventListener('click', openUnlockDrawer_);
    } else {
      var selBtn = document.createElement('button');
      selBtn.type = 'button';
      selBtn.className = 'product-card__select' + (isSelected ? ' is-selected' : '');
      selBtn.title = isSelected ? t_('removeTitle') : t_('addTitle');
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
        attachResilientImage_(img, media, item.link, primaryThumbSize, 320);
        media.appendChild(img);

        var hint = document.createElement('span');
        hint.className = 'product-card__zoom-hint';
        hint.textContent = t_('zoomHint');
        media.appendChild(hint);

        media.addEventListener('click', function () {
          var qIdx = viewableQueue.indexOf(item);
          openLightboxForItem_(item, viewableQueue, qIdx >= 0 ? qIdx : 0);
        });
      } else {
        var noImg = document.createElement('div');
        noImg.className = 'product-card__placeholder';
        noImg.innerHTML = '<span>📦</span><span>' + escapeHtml_(t_('noPreview')) + '</span>';
        media.appendChild(noImg);
      }
    }

    card.appendChild(media);

    // Body area
    var body = document.createElement('div');
    body.className = 'product-card__body';

    var infoWrap = document.createElement('div');
    infoWrap.className = 'product-card__info-wrap';

    var title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = masked ? t_('lockedCardTitle') : getItemTitle_(item);
    if (!masked) title.title = getItemTitle_(item);

    var meta = document.createElement('div');
    meta.className = 'product-card__meta';
    meta.textContent = masked ? t_('lockedTime') : item.timeFormatted;

    infoWrap.appendChild(title);
    infoWrap.appendChild(meta);
    body.appendChild(infoWrap);

    var actions = document.createElement('div');
    actions.className = 'product-card__actions';

    if (masked) {
      var unlockAction = document.createElement('button');
      unlockAction.type = 'button';
      unlockAction.className = 'card-action-btn';
      unlockAction.textContent = t_('unlockCardBtn');
      unlockAction.addEventListener('click', openUnlockDrawer_);
      actions.appendChild(unlockAction);
    } else {
      if (item.link) {
        var zoomBtn = document.createElement('button');
        zoomBtn.type = 'button';
        zoomBtn.className = 'card-action-btn';
        zoomBtn.textContent = t_('zoomBtn');
        zoomBtn.addEventListener('click', function () {
          var qIdx = viewableQueue.indexOf(item);
          openLightboxForItem_(item, viewableQueue, qIdx >= 0 ? qIdx : 0);
        });
        actions.appendChild(zoomBtn);
      }

      var listSelBtn = document.createElement('button');
      listSelBtn.type = 'button';
      listSelBtn.className = 'card-action-btn list-select-btn' + (isSelected ? ' is-selected' : '');
      listSelBtn.textContent = isSelected ? t_('selectShortAdded') : t_('selectShortAdd');
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
        driveLink.textContent = t_('originalLink');
        actions.appendChild(driveLink);
      }
    }

    body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  /* ==================== Catalog & Pagination ==================== */
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

    var modeClass =
      state.viewMode === 'list'
        ? 'catalog--list'
        : state.viewMode === 'large'
        ? 'catalog--large'
        : 'catalog--grid';

    feed.className = 'catalog ' + modeClass;
    feed.innerHTML = '';

    if (pageSlice.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<div class="empty-state__icon">🔎</div>' +
        '<h3 class="empty-state__title">' +
        escapeHtml_(t_('emptyTitle')) +
        '</h3>' +
        '<p class="empty-state__desc">' +
        escapeHtml_(t_('emptyDesc')) +
        '</p>';
      var resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn btn--primary';
      resetBtn.textContent = t_('resetFilters');
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
    var parts = [t_('showingCount')(filteredTotal)];
    if (state.searchQuery.trim()) parts.push(t_('searchTag')(state.searchQuery.trim()));
    else if (state.activeTag) parts.push(t_('seriesFiltered'));
    el.textContent = parts.join(' · ');
  }

  function renderPagination_(total, start, sliceLen, totalPages) {
    var nav = document.getElementById('pagination');
    var rangeEl = document.getElementById('page-range');
    var prevBtn = document.getElementById('page-prev');
    var nextBtn = document.getElementById('page-next');
    var numsWrap = document.getElementById('page-numbers');
    var mobInfo = document.getElementById('page-mobile-info');
    if (!nav || !prevBtn || !nextBtn || !numsWrap) return;

    if (total === 0 || totalPages <= 1) {
      nav.hidden = true;
      return;
    }

    nav.hidden = false;
    if (rangeEl) {
      rangeEl.textContent = t_('pageRange')(start + 1, start + sliceLen, total);
    }
    if (mobInfo) {
      mobInfo.textContent = state.currentPage + 1 + ' / ' + totalPages;
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

  /* ==================== Inquiry Selection List ==================== */
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
    showToast_(t_('clearedToast'));
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
    countEl.textContent = t_('selectedCount')(selected.length);
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
    var lines = [t_('inquiryHeader')(items.length)];
    items.forEach(function (item, idx) {
      lines.push(
        idx + 1 + '. ' + getItemTitle_(item) + ' (' + item.timeFormatted + ')' + (item.link ? '\n   ' + item.link : '')
      );
    });
    return lines.join('\n');
  }

  function copySelectedList_() {
    var selected = getSelectedItems_();
    if (selected.length === 0) {
      showToast_(t_('pickFirstToast'));
      return;
    }
    copyTextToClipboard_(formatInquiryText_(selected))
      .then(function () {
        showToast_(t_('copiedListToast')(selected.length));
      })
      .catch(function () {
        showToast_(t_('copyFailedToast'));
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
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--text-muted);padding:24px 0;">' +
        escapeHtml_(t_('modalEmpty')) +
        '</p>';
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
          escapeHtml_(getItemTitle_(item)) +
          '</div>' +
          '<div class="modal-item__time">' +
          escapeHtml_(item.timeFormatted) +
          '</div>';
        row.appendChild(info);

        var rmBtn = document.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'modal-item__remove';
        rmBtn.textContent = t_('removeBtn');
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

  /* ==================== Full-Screen HD Lightbox ==================== */
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
    if (zoomBtn) zoomBtn.textContent = zoomed ? t_('zoomOutBtn') : t_('zoomBtn');
  }

  function updateLightboxSelectionBtn_() {
    var btn = document.getElementById('lb-select-btn');
    if (!btn || state.lightboxIndex < 0) return;
    var item = state.lightboxList[state.lightboxIndex];
    if (!item) return;
    var selected = !!state.selectedKeys[item.key];
    btn.classList.toggle('is-selected', selected);
    btn.textContent = selected ? t_('selectAdded') : t_('selectAdd');
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
    if (titleEl) titleEl.textContent = getItemTitle_(item);
    if (timeEl) timeEl.textContent = t_('lbPosted')(item.timeFormatted);
    if (newBadge) newBadge.hidden = !(item.newestRank < CONFIG.NEW_BADGE_COUNT);
    if (driveLink) driveLink.href = item.link;
    if (prevBtn) prevBtn.disabled = state.lightboxIndex <= 0;
    if (nextBtn) nextBtn.disabled = state.lightboxIndex >= state.lightboxList.length - 1;

    updateLightboxSelectionBtn_();

    if (imgEl && spinner) {
      var previewUrl = getThumbUrl_(item.link, 600);
      var hiResUrl = getThumbUrl_(item.link, 1600);
      var currentKey = item.key;

      imgEl.src = previewUrl;
      imgEl.alt = getItemTitle_(item);
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

  /* ==================== Password Drawer ==================== */
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
      showToast_(t_('unlockedToast'));
    } else if (err) {
      err.textContent = t_('wrongPass');
      input.focus();
      input.select();
    }
  }

  /* ==================== Theme & Language ==================== */
  function syncThemeColorMeta_(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0f13' : '#f6f5f1');
  }

  function initTheme_() {
    var saved = '';
    try {
      saved = localStorage.getItem(THEME_STORAGE_KEY) || '';
    } catch (e) {}
    var theme = saved === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeColorMeta_(theme);
  }

  function toggleTheme_() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    syncThemeColorMeta_(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (e) {}
  }

  function initLang_() {
    var saved = '';
    try {
      saved = localStorage.getItem(LANG_STORAGE_KEY) || '';
    } catch (e) {}
    state.lang = saved === 'zh' ? 'zh' : CONFIG.DEFAULT_LANG;
    applyStaticTranslations_();
  }

  function toggleLang_() {
    state.lang = state.lang === 'en' ? 'zh' : 'en';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, state.lang);
    } catch (e) {}
    applyStaticTranslations_();
    renderAll_();
    var lb = document.getElementById('lightbox');
    if (lb && !lb.hidden) renderLightboxCurrent_();
    var modal = document.getElementById('selection-modal');
    if (modal && !modal.hidden) openSelectionModal_();
  }

  /* ==================== Data Load ==================== */
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
      setText_('status', t_('syncFailed'));
      showError_(t_('configErr'));
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
          showToast_(t_('syncedToast')(state.allItems.length));
        }
      })
      .catch(function (e) {
        setText_('status', t_('syncFailed'));
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

  /* ==================== Event Bindings ==================== */
  function bindEvents_() {
    var themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme_);

    var langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) langBtn.addEventListener('click', toggleLang_);

    var refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        loadData_(true);
      });
    }

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

    var latestTrack = document.getElementById('latest-track');
    var latestPrev = document.getElementById('latest-prev');
    var latestNext = document.getElementById('latest-next');
    if (latestTrack && latestPrev && latestNext) {
      latestPrev.addEventListener('click', function () {
        latestTrack.scrollBy({ left: -300, behavior: 'smooth' });
      });
      latestNext.addEventListener('click', function () {
        latestTrack.scrollBy({ left: 300, behavior: 'smooth' });
      });
    }

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

    var hideLockedToggle = document.getElementById('hide-locked-toggle');
    if (hideLockedToggle) {
      hideLockedToggle.checked = state.hideLocked;
      hideLockedToggle.addEventListener('change', function () {
        state.hideLocked = hideLockedToggle.checked;
        state.currentPage = 0;
        renderCatalog_();
      });
    }

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

    var gridBtn = document.getElementById('view-grid-btn');
    var largeBtn = document.getElementById('view-large-btn');
    var listBtn = document.getElementById('view-list-btn');
    function setViewMode(mode) {
      state.viewMode = mode;
      [
        [gridBtn, 'grid'],
        [largeBtn, 'large'],
        [listBtn, 'list']
      ].forEach(function (pair) {
        var btn = pair[0];
        var m = pair[1];
        if (btn) {
          btn.classList.toggle('is-active', mode === m);
          btn.setAttribute('aria-pressed', mode === m ? 'true' : 'false');
        }
      });
      renderCatalog_();
    }
    if (gridBtn) gridBtn.addEventListener('click', function () { setViewMode('grid'); });
    if (largeBtn) largeBtn.addEventListener('click', function () { setViewMode('large'); });
    if (listBtn) listBtn.addEventListener('click', function () { setViewMode('list'); });

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
        var text = getItemTitle_(cur) + ' (' + cur.timeFormatted + ')\n' + (cur.link || '');
        copyTextToClipboard_(text)
          .then(function () { showToast_(t_('copiedItemToast')); })
          .catch(function () { showToast_(t_('copyFailedToast')); });
      });
    }

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
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.35) {
            stepLightbox_(dx < 0 ? 1 : -1);
          }
        },
        { passive: true }
      );
    }

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

  /* ==================== Init ==================== */
  initTheme_();
  initLang_();
  bindEvents_();
  loadData_(false);
})();
