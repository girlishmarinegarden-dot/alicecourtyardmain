/**
 * Sheet config (same as GAS). If News is not the first tab, set GID from the sheet URL.
 */
(function () {
  'use strict';

  var CONFIG = {
    SPREADSHEET_ID: '1WFuFX7jVCV0ZVm5HBsHbMB8qOew2wVhnL8tNzWsjss4',
    GID: '0'
  };

  /** Flashing NEW on the newest N rows */
  var NEW_BADGE_COUNT = 3;

  /** Feed + ticker: items per page (lazy: only current page is rendered) */
  var PAGE_SIZE = 20;

  /** hasText=false rows are masked until password; unlock lasts for this page load only */
  var UNLOCK_PASS = 'alicecourtyardr18';
  var unlockedThisPage_ = false;

  var gvizLoadGen_ = 0;
  var cachedRows_ = null;
  var orderedSnapshot_ = null;
  var currentPage_ = 0;
  var searchQuery_ = '';
  var gvizTimer_ = null;

  function gvizUrl() {
    return (
      'https://docs.google.com/spreadsheets/d/' +
      CONFIG.SPREADSHEET_ID +
      '/gviz/tq?tqx=out:json&gid=' +
      CONFIG.GID
    );
  }

  /** Load gviz via dynamic <script> to avoid fetch CORS (file:// / GitHub Pages). */
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
        done(new Error('Timeout loading spreadsheet'));
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
        done(
          new Error(
            'Script load failed. Set the sheet to "Anyone with the link can view" and check SPREADSHEET_ID / gid.'
          )
        );
      };
      document.head.appendChild(scriptEl);
    });
  }

  function cellValue(cell) {
    if (!cell) return '';
    if (cell.v == null) return '';
    if (typeof cell.v === 'object' && cell.v !== null && 'getTime' in Object(cell.v)) {
      try {
        return new Date(cell.v).toLocaleString('en-US');
      } catch (e) {
        return String(cell.f || cell.v);
      }
    }
    return String(cell.f != null ? cell.f : cell.v);
  }

  function rowsFromGviz(parsed) {
    var table = parsed.table;
    if (!table || !table.rows) return [];
    var rows = table.rows.map(function (row) {
      var c = row.c || [];
      return [cellValue(c[0]), cellValue(c[1]), cellValue(c[2]), cellValue(c[3])];
    });
    if (rows.length && isHeaderRow_(rows[0])) {
      rows = rows.slice(1);
    }
    return rows;
  }

  function isHeaderRow_(row) {
    var a = String(row[0] || '').trim().toLowerCase();
    var b = String(row[1] || '').trim().toLowerCase();
    if (a === 'time' && b === 'text') return true;
    if (row[0] === '时间' && row[1] === '文案') return true;
    return false;
  }

  function parseTimeMs_(timeDisplay) {
    var t = Date.parse(String(timeDisplay || '').trim());
    return isNaN(t) ? 0 : t;
  }

  /** Sort by first column time, newest first */
  function sortRowsNewestFirst_(rows) {
    return rows.slice().sort(function (a, b) {
      return parseTimeMs_(b[0]) - parseTimeMs_(a[0]);
    });
  }

  /** Sheet column 4 hasText — true shows normally */
  function hasTextIsTrue_(raw) {
    if (raw === true) return true;
    if (raw === false) return false;
    var s = String(raw).trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === '1' || s === '是';
  }

  function isUnlocked_() {
    return unlockedThisPage_;
  }

  /** Row masked when hasText is false and not unlocked this page */
  function isRowMasked_(r) {
    return !hasTextIsTrue_(r[3]) && !isUnlocked_();
  }

  function driveThumbUrl(link) {
    if (!link) return '';
    var m = link.match(/\/file\/d\/([^/]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w200';
    return link;
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /** Filter by sheet text column (caption); case-insensitive substring */
  function getFilteredOrdered_() {
    var ordered = orderedSnapshot_ || [];
    var q = searchQuery_.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(function (r) {
      return String(r[1] || '')
        .toLowerCase()
        .indexOf(q) !== -1;
    });
  }

  /** Original index in full sorted list (for NEW badge) */
  function globalIndexForRow_(r) {
    var ordered = orderedSnapshot_ || [];
    var i = ordered.indexOf(r);
    return i >= 0 ? i : 0;
  }

  function updateFindCount_() {
    var el = document.getElementById('find-count');
    if (!el) return;
    var all = (orderedSnapshot_ || []).length;
    var fil = getFilteredOrdered_().length;
    var q = searchQuery_.trim();
    if (!q) {
      el.textContent = '';
      return;
    }
    el.textContent =
      fil + ' match' + (fil === 1 ? '' : 'es') + ' · ' + all + ' total';
  }

  function updateUnlockPanel_(rows) {
    var panel = document.getElementById('unlock-panel');
    if (!panel) return;
    var anyMasked = rows.some(function (r) {
      return !hasTextIsTrue_(r[3]);
    });
    panel.hidden = !(anyMasked && !isUnlocked_());
  }

  function newBadgeHtml_(show) {
    return show
      ? ' <span class="badge-new" aria-label="New">NEW</span>'
      : '';
  }

  function tickerItemEl_(r, globalIndex) {
    var masked = isRowMasked_(r);
    var time = r[0] || '';
    var body = r[1] || '';
    var link = r[2] || '';
    var showNew = globalIndex < NEW_BADGE_COUNT;

    var wrap = document.createElement('div');
    wrap.className = masked ? 'item item--masked' : 'item';

    if (masked) {
      var lockBox = document.createElement('div');
      lockBox.className = 'item-lock';
      lockBox.textContent = '🔒';
      wrap.appendChild(lockBox);
      var mid = document.createElement('div');
      mid.innerHTML =
        '<div class="meta">--' + newBadgeHtml_(showNew) + '</div>' +
        '<div class="body item-masked-text">Hidden</div>';
      wrap.appendChild(mid);
      return wrap;
    }

    if (link) {
      var img = document.createElement('img');
      img.src = driveThumbUrl(link);
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.onerror = function () {
        this.style.display = 'none';
      };
      wrap.appendChild(img);
    }
    var mid2 = document.createElement('div');
    mid2.innerHTML =
      '<div class="meta">' +
      escapeHtml(time) +
      newBadgeHtml_(showNew) +
      '</div>' +
      '<div class="body">' +
      escapeHtml(body) +
      '</div>';
    wrap.appendChild(mid2);
    if (link) {
      var a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'click to view';
      a.className = 'link-gold link-gold--sm';
      wrap.appendChild(a);
    }
    return wrap;
  }

  function feedCardEl_(r, globalIndex) {
    var masked = isRowMasked_(r);
    var card = document.createElement('div');
    card.className = masked ? 'card card--masked' : 'card';
    var showNew = globalIndex < NEW_BADGE_COUNT;

    var cols = document.createElement('div');
    cols.className = 'card-cols';

    var thumbCol = document.createElement('div');
    thumbCol.className = 'card-col card-col--thumb';
    if (masked) {
      thumbCol.classList.add('card-col--thumb-lock');
      thumbCol.textContent = '🔒';
    } else if (r[2]) {
      var cimg = document.createElement('img');
      cimg.src = driveThumbUrl(r[2]);
      cimg.alt = '';
      cimg.referrerPolicy = 'no-referrer';
      cimg.onerror = function () {
        this.remove();
        thumbCol.classList.add('card-col--thumb-empty');
      };
      thumbCol.appendChild(cimg);
    } else {
      thumbCol.classList.add('card-col--thumb-empty');
    }

    var dtCol = document.createElement('div');
    dtCol.className = 'card-col card-col--datetime';
    dtCol.innerHTML = masked
      ? '<span class="card-datetime">--</span>' + newBadgeHtml_(showNew)
      : '<span class="card-datetime">' +
        escapeHtml(r[0] || '') +
        '</span>' +
        newBadgeHtml_(showNew);

    var bodyCol = document.createElement('div');
    bodyCol.className = 'card-col card-col--body';
    bodyCol.textContent = masked ? 'Hidden (no on-image text)' : r[1] || '';

    var linkCol = document.createElement('div');
    linkCol.className = 'card-col card-col--link';
    if (masked) {
      var sp = document.createElement('span');
      sp.className = 'card-link-muted';
      sp.textContent = '—';
      linkCol.appendChild(sp);
    } else if (r[2]) {
      var ca = document.createElement('a');
      ca.href = r[2];
      ca.target = '_blank';
      ca.rel = 'noopener';
      ca.textContent = 'click to view';
      ca.className = 'link-gold card-link';
      linkCol.appendChild(ca);
    } else {
      var dash = document.createElement('span');
      dash.className = 'card-link-muted';
      dash.textContent = '—';
      linkCol.appendChild(dash);
    }

    cols.appendChild(thumbCol);
    cols.appendChild(dtCol);
    cols.appendChild(bodyCol);
    cols.appendChild(linkCol);
    card.appendChild(cols);
    return card;
  }

  function updatePagination_(total) {
    var nav = document.getElementById('pagination');
    var prev = document.getElementById('page-prev');
    var next = document.getElementById('page-next');
    var info = document.getElementById('page-info');
    if (!nav || !prev || !next || !info) return;

    var totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);
    if (currentPage_ >= totalPages) currentPage_ = Math.max(0, totalPages - 1);

    nav.hidden = total <= PAGE_SIZE;
    info.textContent = 'Page ' + (currentPage_ + 1) + ' of ' + totalPages;
    prev.disabled = currentPage_ <= 0;
    next.disabled = currentPage_ >= totalPages - 1;
  }

  function renderPage_() {
    var ordered = getFilteredOrdered_();
    var ticker = document.getElementById('ticker');
    var feed = document.getElementById('feed');
    if (!ticker || !feed) return;

    ticker.innerHTML = '';
    feed.innerHTML = '';

    var start = currentPage_ * PAGE_SIZE;
    var pageSlice = ordered.slice(start, start + PAGE_SIZE);

    var frag = document.createDocumentFragment();
    pageSlice.forEach(function (r) {
      frag.appendChild(tickerItemEl_(r, globalIndexForRow_(r)));
    });
    ticker.appendChild(frag);
    if (pageSlice.length > 0) {
      var clone = ticker.cloneNode(true);
      clone.removeAttribute('id');
      ticker.appendChild(clone);
    }

    pageSlice.forEach(function (r) {
      feed.appendChild(feedCardEl_(r, globalIndexForRow_(r)));
    });

    if (pageSlice.length === 0 && searchQuery_.trim() && (orderedSnapshot_ || []).length > 0) {
      var empty = document.createElement('p');
      empty.className = 'feed-empty gal-panel';
      empty.textContent = 'No matching caption.';
      feed.appendChild(empty);
    }

    updatePagination_(ordered.length);
    updateFindCount_();
  }

  function goPage_(delta) {
    var ordered = getFilteredOrdered_();
    var totalPages = ordered.length === 0 ? 1 : Math.ceil(ordered.length / PAGE_SIZE);
    var maxIdx = Math.max(0, totalPages - 1);
    currentPage_ = Math.max(0, Math.min(maxIdx, currentPage_ + delta));
    renderPage_();
    var feed = document.getElementById('feed');
    if (feed && feed.scrollIntoView) {
      feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function render(rows) {
    cachedRows_ = rows;
    orderedSnapshot_ = sortRowsNewestFirst_(rows);
    updateUnlockPanel_(orderedSnapshot_);
    currentPage_ = 0;
    renderPage_();
  }

  function bindPagination_() {
    var prev = document.getElementById('page-prev');
    var next = document.getElementById('page-next');
    if (!prev || !next || prev.dataset.bound) return;
    prev.dataset.bound = '1';
    next.dataset.bound = '1';
    prev.addEventListener('click', function () {
      goPage_(-1);
    });
    next.addEventListener('click', function () {
      goPage_(1);
    });
  }

  function bindFindBar_() {
    var input = document.getElementById('find-input');
    var clearBtn = document.getElementById('find-clear');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = '1';
    var debounceTimer = null;

    function applyFind() {
      searchQuery_ = input.value;
      currentPage_ = 0;
      renderPage_();
    }

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFind, 200);
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        clearTimeout(debounceTimer);
        applyFind();
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        searchQuery_ = '';
        currentPage_ = 0;
        renderPage_();
      });
    }
  }

  function bindUnlockUi_() {
    var btn = document.getElementById('unlock-btn');
    var input = document.getElementById('unlock-pw');
    if (!btn || !input || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    function tryUnlock() {
      var err = document.getElementById('unlock-err');
      if (err) err.textContent = '';
      if (input.value.trim() === UNLOCK_PASS) {
        unlockedThisPage_ = true;
        input.value = '';
        if (cachedRows_) render(cachedRows_);
      } else if (err) {
        err.textContent = 'Wrong password';
      }
    }

    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') tryUnlock();
    });
  }

  function showError(msg) {
    var el = document.getElementById('error');
    el.hidden = false;
    el.textContent = msg;
  }

  function load() {
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      document.getElementById('status').textContent = 'Set CONFIG.SPREADSHEET_ID and GID in news.js';
      showError('Spreadsheet not configured: edit CONFIG at the top of news.js.');
      return;
    }
    document.getElementById('error').hidden = true;
    loadGvizViaScript_(gvizUrl())
      .then(function (parsed) {
        var rows = rowsFromGviz(parsed);
        document.getElementById('status').textContent =
          rows.length + ' item' + (rows.length === 1 ? '' : 's') + ' · loaded this visit';
        searchQuery_ = '';
        var findIn = document.getElementById('find-input');
        if (findIn) findIn.value = '';
        render(rows);
      })
      .catch(function (e) {
        document.getElementById('status').textContent = 'Failed to load';
        showError(String(e.message || e));
      });
  }

  /** Gal stage: show video when file exists; standee placeholder when 立绘 missing */
  function initGalStage_() {
    var stage = document.getElementById('gal-stage');
    var vid = document.querySelector('.gal-bg-video');
    if (vid && stage) {
      vid.addEventListener('loadeddata', function () {
        stage.classList.add('gal-video-ready');
      });
      vid.addEventListener('error', function () {
        stage.classList.add('gal-video-missing');
      });
      if (vid.readyState >= 2) {
        stage.classList.add('gal-video-ready');
      }
    }
    var sprSlot = document.getElementById('gal-sprite');
    var sprImg = document.querySelector('.gal-sprite-img');
    if (sprSlot && sprImg) {
      sprImg.addEventListener('error', function () {
        sprSlot.classList.add('is-empty');
      });
      sprImg.addEventListener('load', function () {
        sprSlot.classList.remove('is-empty');
      });
      if (sprImg.complete && sprImg.naturalWidth === 0) {
        sprSlot.classList.add('is-empty');
      }
    }
  }

  initGalStage_();
  bindUnlockUi_();
  bindPagination_();
  bindFindBar_();
  load();
})();
