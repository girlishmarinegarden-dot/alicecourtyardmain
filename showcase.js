/**
 * 晒卡光荣墙：独立 GAS（showcase/gas/showcase.gs）JSONP 或 gviz 读晒图回复表
 */
(function () {
  'use strict';

  var CONFIG = {
    /** 须单独部署 showcase/gas/showcase.gs（含 doGet），勿与私人摊位共用同一脚本项目 */
    GAS_URL:
      'https://script.google.com/macros/s/AKfycbyU8pOfm8Bic1JlrtJ6_ozI2Gc_oabnx3knUpnZVMoascSDRXz1gRiqIBWFvMS7IALj/exec',
    /** gviz 回退：晒图回复表所在工作簿 */
    SPREADSHEET_ID: '15md0Guy5zVLCXs3kIqo-W1VhMCtHl-hI0vHLEd2s9_8',
    /** 工作表「Form Responses 1」的 gid */
    SHOWCASE_GID: '1160003624',
    GOOGLE_FORM_URL:
      'https://docs.google.com/forms/d/e/1FAIpQLSckwKPkmhD0PYyr2DyrQx1BAmwhxWj5jng3r5lcK8KiCCjEow/viewform'
  };

  var PAGE_SIZE = 9;
  var gvizLoadGen_ = 0;
  var gvizTimer_ = null;
  var cachedRows_ = null;
  var orderedSnapshot_ = null;
  var currentPage_ = 0;
  var searchQuery_ = '';
  var dataSource_ = '';

  function gvizUrl() {
    return (
      'https://docs.google.com/spreadsheets/d/' +
      CONFIG.SPREADSHEET_ID +
      '/gviz/tq?tqx=out:json&gid=' +
      CONFIG.SHOWCASE_GID
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
        done(new Error('加载表格超时'));
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
              '表格查询错误';
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
            '无法加载表格。请将晒图回复表设为「知道链接者可查看」，并检查 SHOWCASE_GID。'
          )
        );
      };
      document.head.appendChild(scriptEl);
    });
  }

  function loadGasJsonp_(baseUrl) {
    return new Promise(function (resolve, reject) {
      if (gvizTimer_) {
        clearTimeout(gvizTimer_);
        gvizTimer_ = null;
      }
      var myGen = ++gvizLoadGen_;
      var scriptEl = document.createElement('script');
      var cbName = '_showcase_' + myGen + '_' + String(Date.now()).replace(/\D/g, '');

      function finish(err, rows) {
        if (myGen !== gvizLoadGen_) return;
        if (gvizTimer_) {
          clearTimeout(gvizTimer_);
          gvizTimer_ = null;
        }
        try {
          delete window[cbName];
        } catch (e2) {}
        if (scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
        if (err) reject(err);
        else resolve(rows);
      }

      gvizTimer_ = setTimeout(function () {
        finish(
          new Error(
            'GAS 请求超时（40s）。请确认脚本含 doGet、已部署新版本，且晒图工作簿可被脚本打开。'
          )
        );
      }, 40000);

      window[cbName] = function (data) {
        if (myGen !== gvizLoadGen_) return;
        if (!data || !data.ok) {
          finish(new Error((data && data.error) || 'GAS 返回错误'), null);
          return;
        }
        if (!Array.isArray(data.rows)) {
          finish(new Error('GAS 返回格式无效（缺少 rows 数组）'), null);
          return;
        }
        finish(null, data.rows);
      };

      var sep = baseUrl.indexOf('?') >= 0 ? '&' : '?';
      scriptEl.src =
        baseUrl +
        sep +
        'callback=' +
        encodeURIComponent(cbName) +
        '&action=list&_=' +
        Date.now();
      scriptEl.async = true;
      scriptEl.onerror = function () {
        if (myGen !== gvizLoadGen_) return;
        finish(
          new Error(
            '无法加载 GAS。请确认 Web 应用部署为「任何人」且 URL 以 /exec 结尾。'
          ),
          null
        );
      };
      document.head.appendChild(scriptEl);
    });
  }

  function shouldUseGas_() {
    var u = CONFIG.GAS_URL && String(CONFIG.GAS_URL).trim();
    return u.length > 0 && u.indexOf('/exec') !== -1;
  }

  function loadRows_() {
    if (!shouldUseGas_()) {
      dataSource_ = 'gviz';
      return loadGvizViaScript_(gvizUrl()).then(rowsFromGviz);
    }
    return loadGasJsonp_(String(CONFIG.GAS_URL).trim())
      .then(function (rows) {
        dataSource_ = 'gas';
        return rows;
      })
      .catch(function (gasErr) {
        if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
          return Promise.reject(gasErr);
        }
        if (!CONFIG.SHOWCASE_GID) {
          return Promise.reject(gasErr);
        }
        return loadGvizViaScript_(gvizUrl())
          .then(function (parsed) {
            dataSource_ = 'gviz-fallback';
            return rowsFromGviz(parsed);
          })
          .catch(function (gvizErr) {
            return Promise.reject(
              new Error(
                '[GAS] ' +
                  String(gasErr.message || gasErr) +
                  '\n\n[gviz] ' +
                  String(gvizErr.message || gvizErr) +
                  '\n\n请检查 showcase.gs 部署、脚本属性 SPREADSHEET_ID/SHEET_NAME，或配置 SHOWCASE_GID 并公开表格。'
              )
            );
          });
      });
  }

  function cellValue(cell) {
    if (!cell) return '';
    if (cell.v == null) return '';
    if (typeof cell.v === 'object' && cell.v !== null && 'getTime' in Object(cell.v)) {
      try {
        return new Date(cell.v).toLocaleString('zh-CN');
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
    var timeLike =
      a === 'time' ||
      a === 'timestamp' ||
      a.indexOf('时间') === 0 ||
      a.indexOf('时间戳') !== -1;
    var photoLike =
      b === 'imagelinks' ||
      b.indexOf('product photo') !== -1 ||
      b.indexOf('card photo') !== -1 ||
      b.indexOf('upload') !== -1 ||
      b.indexOf('上传') !== -1 ||
      b.indexOf('文件') !== -1;
    if (timeLike && photoLike) return true;
    return false;
  }

  function parseImageLinks(raw) {
    var s = String(raw || '').trim();
    if (!s) return [];
    var chunks = s.split(/[\n\r]+|[,;|]+/).map(function (x) {
      return x.trim();
    });
    var urls = [];
    chunks.forEach(function (chunk) {
      if (!chunk) return;
      if (/^https?:\/\//i.test(chunk)) {
        urls.push(chunk);
        return;
      }
      var re = /https?:\/\/[^\s<>"']+/gi;
      var m;
      while ((m = re.exec(chunk)) !== null) {
        urls.push(m[0].replace(/[,;.]+$/, ''));
      }
    });
    return urls.filter(function (u, i, arr) {
      return arr.indexOf(u) === i;
    });
  }

  function driveThumbUrl(link) {
    var m = link.match(/\/file\/d\/([^/]+)/);
    var id = m ? m[1] : null;
    if (!id) {
      m = link.match(/[?&]id=([^&]+)/);
      id = m ? m[1] : null;
    }
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w480';
    return link;
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function parseTimeMs_(timeDisplay) {
    var t = Date.parse(String(timeDisplay || '').trim());
    return isNaN(t) ? 0 : t;
  }

  function sortRowsNewestFirst_(rows) {
    return rows.slice().sort(function (a, b) {
      return parseTimeMs_(b[0]) - parseTimeMs_(a[0]);
    });
  }

  function getFilteredOrdered_() {
    var ordered = orderedSnapshot_ || [];
    var q = searchQuery_.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(function (r) {
      return (
        String(r[2] || '')
          .toLowerCase()
          .indexOf(q) !== -1 ||
        String(r[3] || '')
          .toLowerCase()
          .indexOf(q) !== -1
      );
    });
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
    el.textContent = '匹配 ' + fil + ' / 共 ' + all + ' 张';
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
    info.textContent = '第 ' + (currentPage_ + 1) + ' / ' + totalPages + ' 页';
    prev.disabled = currentPage_ <= 0;
    next.disabled = currentPage_ >= totalPages - 1;
  }

  function showcaseCardEl_(r) {
    var time = r[0] || '';
    var links = parseImageLinks(r[1]);
    var title = r[2] || '';
    var note = r[3] || '';

    var card = document.createElement('article');
    card.className = 'showcase-card';

    var visual = document.createElement('div');
    visual.className = 'showcase-card__visual';
    var first = links[0];
    if (first) {
      var a = document.createElement('a');
      a.className = 'showcase-card__img-wrap';
      a.href = first;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      var img = document.createElement('img');
      img.src = driveThumbUrl(first);
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.loading = 'lazy';
      img.onerror = function () {
        this.style.opacity = '0.4';
      };
      a.appendChild(img);
      visual.appendChild(a);
      if (links.length > 1) {
        var badge = document.createElement('span');
        badge.className = 'showcase-card__badge';
        badge.textContent = '+' + (links.length - 1);
        visual.appendChild(badge);
      }
    } else {
      var ph = document.createElement('div');
      ph.className = 'showcase-card__placeholder';
      ph.textContent = 'No photo';
      visual.appendChild(ph);
    }
    card.appendChild(visual);

    var body = document.createElement('div');
    body.className = 'showcase-card__body';
    var h = document.createElement('h3');
    h.className = 'showcase-card__title';
    h.textContent = title || '—';
    body.appendChild(h);
    var p = document.createElement('p');
    p.className = 'showcase-card__note';
    p.innerHTML = note ? escapeHtml(note) : '<span class="showcase-card__dash">—</span>';
    body.appendChild(p);
    if (links.length) {
      var drives = document.createElement('div');
      drives.className = 'showcase-card__drives';
      links.forEach(function (url, idx) {
        var la = document.createElement('a');
        la.className = 'showcase-card__drive';
        la.href = url;
        la.target = '_blank';
        la.rel = 'noopener noreferrer';
        la.textContent = links.length === 1 ? 'Drive' : 'Drive ' + (idx + 1);
        drives.appendChild(la);
      });
      body.appendChild(drives);
    }
    var meta = document.createElement('div');
    meta.className = 'showcase-card__meta';
    meta.textContent = time;
    body.appendChild(meta);
    card.appendChild(body);

    return card;
  }

  function renderPage_() {
    var grid = document.getElementById('showcase-grid');
    if (!grid) return;

    var ordered = getFilteredOrdered_();
    grid.innerHTML = '';

    var start = currentPage_ * PAGE_SIZE;
    var pageSlice = ordered.slice(start, start + PAGE_SIZE);

    pageSlice.forEach(function (r) {
      grid.appendChild(showcaseCardEl_(r));
    });

    if (pageSlice.length === 0 && searchQuery_.trim() && (orderedSnapshot_ || []).length > 0) {
      var empty = document.createElement('p');
      empty.className = 'showcase-empty';
      empty.textContent = '没有匹配的晒卡。';
      grid.appendChild(empty);
    }

    if (pageSlice.length === 0 && !searchQuery_.trim() && (orderedSnapshot_ || []).length === 0) {
      var empty2 = document.createElement('p');
      empty2.className = 'showcase-empty';
      empty2.textContent = '暂无晒卡。提交 Google 表单后在此展示（须部署 showcase.gs 或公开表格 gid）。';
      grid.appendChild(empty2);
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
    var grid = document.getElementById('showcase-grid');
    if (grid && grid.scrollIntoView) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function render(rows) {
    cachedRows_ = rows;
    orderedSnapshot_ = sortRowsNewestFirst_(rows);
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

  function bindConsentForm_() {
    var cb = document.getElementById('consent-checkbox');
    var btn = document.getElementById('open-form-btn');
    if (!cb || !btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    function sync() {
      btn.disabled = !cb.checked;
    }
    cb.addEventListener('change', sync);
    sync();

    btn.addEventListener('click', function () {
      if (!cb.checked) return;
      var url = CONFIG.GOOGLE_FORM_URL;
      if (!url || url.indexOf('YOUR_') !== -1) {
        alert('请在 showcase.js 中设置 CONFIG.GOOGLE_FORM_URL 为晒图 Google 表单链接。');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function showError(msg) {
    var el = document.getElementById('error');
    if (!el) return;
    el.hidden = false;
    el.textContent = msg;
  }

  function load() {
    var st = document.getElementById('status');
    if (!shouldUseGas_()) {
      if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
        if (st) st.textContent = '未配置';
        showError('请设置 CONFIG.SPREADSHEET_ID 与 SHOWCASE_GID，或填写 GAS_URL 使用脚本读表。');
        render([]);
        return;
      }
      if (!CONFIG.SHOWCASE_GID) {
        if (st) st.textContent = '未配置';
        showError('纯 gviz 模式需要 CONFIG.SHOWCASE_GID（晒图回复表工作表的 gid）。');
        render([]);
        return;
      }
    }
    var errEl = document.getElementById('error');
    if (errEl) errEl.hidden = true;
    loadRows_()
      .then(function (rows) {
        if (st) {
          var srcLabel =
            dataSource_ === 'gas'
              ? 'GAS（晒图专用脚本）'
              : dataSource_ === 'gviz-fallback'
                ? '公开表格（GAS 回退）'
                : '公开表格';
          st.textContent = '共 ' + rows.length + ' 张晒卡 · ' + srcLabel;
        }
        searchQuery_ = '';
        var findIn = document.getElementById('find-input');
        if (findIn) findIn.value = '';
        render(rows);
      })
      .catch(function (e) {
        if (st) st.textContent = '加载失败';
        showError(String(e.message || e));
        render([]);
      });
  }

  function initGalStage_() {
    var stage = document.getElementById('gal-stage');
    var vid = document.querySelector('.gal-bg-video');
    var boot = document.getElementById('gal-boot');
    var settled = false;

    function revealPage_() {
      if (settled) return;
      settled = true;
      document.body.classList.add('gal-ready');
      if (boot) {
        boot.setAttribute('aria-busy', 'false');
        boot.setAttribute('aria-hidden', 'true');
      }
    }

    function onVideoReady_() {
      if (settled) return;
      if (stage) stage.classList.add('gal-video-ready');
      revealPage_();
    }

    function onVideoMissing_() {
      if (settled) return;
      if (stage) stage.classList.add('gal-video-missing');
      revealPage_();
    }

    if (!vid || !stage) {
      revealPage_();
    } else {
      vid.preload = 'auto';
      vid.addEventListener('canplaythrough', onVideoReady_);
      vid.addEventListener('error', onVideoMissing_);
      vid.addEventListener('progress', function () {
        if (vid.readyState >= 4) onVideoReady_();
      });
      if (vid.readyState >= 4) {
        onVideoReady_();
      } else {
        setTimeout(function () {
          if (settled) return;
          if (vid.error) onVideoMissing_();
          else if (vid.readyState >= 2) {
            if (stage) stage.classList.add('gal-video-ready');
            revealPage_();
          } else onVideoMissing_();
        }, 18000);
      }
    }
  }

  function init() {
    initGalStage_();
    bindPagination_();
    bindFindBar_();
    bindConsentForm_();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
