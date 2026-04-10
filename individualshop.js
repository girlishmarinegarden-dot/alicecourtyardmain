/**
 * 私人摊位：读表二选一
 * - 若设置 CONFIG.GAS_URL（GAS Web 应用 /exec）：用 JSONP 拉取，表格可不公开（脚本以你的账号读取）。
 * - 否则：gviz 公开读表（表格须「知道链接者可查看」）。
 * 投稿仍仅 Google 表单。
 */
(function () {
  'use strict';

  var CONFIG = {
    /** GAS 只读 Web 应用地址（以 /exec 结尾）。留空则改用下方 gviz。 */
    GAS_URL:
      'https://script.google.com/macros/s/AKfycbwytBFZvMrCMbTyXauc7vclRDnUUqUNRPclaSE-ZJ-cFTulyISWkCrELm8Tc0tfr2iA/exec',
    /** gviz 用：回复表格 ID */
    SPREADSHEET_ID: '1YrqonTaMd2oOS0R1NIU7P5pBWstz7QMC62JbwQa06Fg',
    /** gviz 用：工作表 gid */
    GID: '264584724',
    /** Google 表单填写链接 */
    GOOGLE_FORM_URL:
      'https://docs.google.com/forms/d/e/1FAIpQLSc6TmdMAZ3ERi7z5x0bp4lltt4tIJyxPWr2q8WFDCMfbp7mdA/viewform'
  };

  var PAGE_SIZE = 12;
  var gvizLoadGen_ = 0;
  var gvizTimer_ = null;
  var cachedRows_ = null;
  var orderedSnapshot_ = null;
  var currentPage_ = 0;
  var searchQuery_ = '';
  /** 本次成功加载数据来源：gas | gviz | gviz-fallback */
  var dataSource_ = '';

  function gvizUrl() {
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
            '无法加载表格。请将表格设为「知道链接者可查看」，并检查 individualshop.js 中的 SPREADSHEET_ID 与 GID。'
          )
        );
      };
      document.head.appendChild(scriptEl);
    });
  }

  /** GAS doGet JSONP：返回 { ok, rows: [[A,B,C,D], ...] } */
  function loadGasJsonp_(baseUrl) {
    return new Promise(function (resolve, reject) {
      if (gvizTimer_) {
        clearTimeout(gvizTimer_);
        gvizTimer_ = null;
      }
      var myGen = ++gvizLoadGen_;
      var scriptEl = document.createElement('script');
      var cbName = '_individualshop_' + myGen + '_' + String(Date.now()).replace(/\D/g, '');

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
        finish(new Error('GAS 请求超时（40s）。冷启动较慢时可刷新重试。'));
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
            '无法加载 GAS。请确认已部署 Web 应用且「具有访问权限的用户」为任何人，URL 以 /exec 结尾。'
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
                  '\n\n[gviz 回退也失败] ' +
                  String(gvizErr.message || gvizErr) +
                  '\n\n请检查：1) Apps Script 已部署且执行身份有表格权限 2) 脚本属性 SPREADSHEET_ID 或 GAS 内 FALLBACK 表格 ID 正确 3) 或把表格设为「知道链接者可查看」'
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
    var linkLike =
      b === 'imagelinks' ||
      b === 'image links' ||
      b === 'image_link' ||
      b.indexOf('product photo') !== -1 ||
      b.indexOf('upload') !== -1 ||
      b.indexOf('上传') !== -1 ||
      b.indexOf('文件') !== -1 ||
      b.indexOf('图片链接') !== -1;
    if (timeLike && linkLike) return true;
    if (a === '时间' && (b === '图片链接' || b === '图链')) return true;
    return false;
  }

  /** 从单元格文本中拆出多个 http(s) 链接（支持逗号、分号、换行、竖线分隔） */
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

  function driveIdFromUrl(link) {
    if (!link) return null;
    var m = link.match(/\/file\/d\/([^/]+)/);
    if (m) return m[1];
    m = link.match(/[?&]id=([^&]+)/);
    if (m) return m[1];
    return null;
  }

  function driveThumbUrl(link) {
    var id = driveIdFromUrl(link);
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w240';
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
    el.textContent = '匹配 ' + fil + ' / 共 ' + all + ' 条';
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

  function shopCardEl_(r) {
    var time = r[0] || '';
    var links = parseImageLinks(r[1]);
    var desc = r[2] || '';
    var contact = r[3] || '';

    var card = document.createElement('article');
    card.className = 'shop-card';

    if (!links.length && !desc && !contact && !time) {
      card.innerHTML = '<p class="shop-empty">（空行）</p>';
      return card;
    }

    var timeRow = document.createElement('div');
    timeRow.className = 'shop-card__time';
    timeRow.textContent = time || '—';
    card.appendChild(timeRow);

    var wrap = document.createElement('div');
    wrap.className = 'shop-card__grid-wrap';
    var grid = document.createElement('div');
    grid.className = 'shop-card__grid';
    grid.setAttribute('role', 'row');

    // 1 · 图片
    var cImg = document.createElement('div');
    cImg.className = 'shop-card__cell shop-card__cell--img';
    cImg.setAttribute('role', 'cell');
    if (links.length) {
      var imgInner = document.createElement('div');
      imgInner.className = 'shop-card__thumbs';
      links.forEach(function (url) {
        var a = document.createElement('a');
        a.className = 'shop-card__thumb';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = 'Drive';
        var img = document.createElement('img');
        img.src = driveThumbUrl(url).replace(/sz=w\d+/, 'sz=w120');
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.loading = 'lazy';
        img.onerror = function () {
          this.style.opacity = '0.35';
        };
        a.appendChild(img);
        imgInner.appendChild(a);
      });
      cImg.appendChild(imgInner);
    } else {
      cImg.innerHTML = '<span class="shop-card__dash">—</span>';
    }
    grid.appendChild(cImg);

    // 2 · Drive 链接
    var cLink = document.createElement('div');
    cLink.className = 'shop-card__cell shop-card__cell--links';
    cLink.setAttribute('role', 'cell');
    if (links.length) {
      var linkStack = document.createElement('div');
      linkStack.className = 'shop-card__link-stack';
      links.forEach(function (url, idx) {
        var a = document.createElement('a');
        a.className = 'shop-card__link-pill';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = links.length === 1 ? 'Open · Drive' : 'Drive ' + (idx + 1);
        linkStack.appendChild(a);
      });
      cLink.appendChild(linkStack);
    } else {
      cLink.innerHTML = '<span class="shop-card__dash">—</span>';
    }
    grid.appendChild(cLink);

    // 3 · 说明
    var cDesc = document.createElement('div');
    cDesc.className = 'shop-card__cell shop-card__cell--text';
    cDesc.setAttribute('role', 'cell');
    if (desc) {
      cDesc.innerHTML = escapeHtml(desc);
    } else {
      cDesc.innerHTML = '<span class="shop-card__dash">—</span>';
    }
    grid.appendChild(cDesc);

    // 4 · 联系
    var cCt = document.createElement('div');
    cCt.className = 'shop-card__cell shop-card__cell--contact';
    cCt.setAttribute('role', 'cell');
    if (contact) {
      cCt.innerHTML = escapeHtml(contact);
    } else {
      cCt.innerHTML = '<span class="shop-card__dash">—</span>';
    }
    grid.appendChild(cCt);

    wrap.appendChild(grid);
    card.appendChild(wrap);

    return card;
  }

  function renderPage_() {
    var feed = document.getElementById('feed');
    if (!feed) return;

    var ordered = getFilteredOrdered_();
    feed.innerHTML = '';

    var start = currentPage_ * PAGE_SIZE;
    var pageSlice = ordered.slice(start, start + PAGE_SIZE);

    pageSlice.forEach(function (r) {
      feed.appendChild(shopCardEl_(r));
    });

    if (pageSlice.length === 0 && searchQuery_.trim() && (orderedSnapshot_ || []).length > 0) {
      var empty = document.createElement('p');
      empty.className = 'feed-empty shop-empty gal-panel';
      empty.textContent = '没有匹配的摊位。';
      feed.appendChild(empty);
    }

    if (pageSlice.length === 0 && !searchQuery_.trim() && (orderedSnapshot_ || []).length === 0) {
      var empty2 = document.createElement('p');
      empty2.className = 'feed-empty shop-empty gal-panel';
      empty2.textContent = '暂无刊登。填写 Google 表单后即可在此显示（表格需与 CONFIG 一致）。';
      feed.appendChild(empty2);
    }

    updatePagination_(ordered.length);
    updateFindCount_();

    var colHead = document.getElementById('shop-col-head');
    if (colHead) {
      colHead.hidden = (orderedSnapshot_ || []).length === 0;
    }
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
      if (!url || url.indexOf('YOUR_FORM') !== -1) {
        alert('请先在 individualshop.js 中设置 CONFIG.GOOGLE_FORM_URL 为你的 Google 表单链接。');
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
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
      if (st) st.textContent = '未配置表格';
      showError('请在 individualshop.js 顶部设置 CONFIG.SPREADSHEET_ID 与 GID（与 Google 表单关联的表格）。');
      render([]);
      return;
    }
    var errEl = document.getElementById('error');
    if (errEl) errEl.hidden = true;
    loadRows_()
      .then(function (rows) {
        if (st) {
          var srcLabel =
            dataSource_ === 'gas'
              ? 'GAS'
              : dataSource_ === 'gviz-fallback'
                ? '公开表格（GAS 失败已回退）'
                : '公开表格';
          st.textContent = '共 ' + rows.length + ' 条摊位 · ' + srcLabel;
        }
        searchQuery_ = '';
        var findIn = document.getElementById('find-input');
        if (findIn) findIn.value = '';
        render(rows);
      })
      .catch(function (e) {
        if (st) st.textContent = '加载失败';
        var msg = String(e.message || e);
        if (!shouldUseGas_()) {
          msg +=
            '\n\n若表格未公开：请在 CONFIG 填写 GAS_URL，并在 Apps Script「脚本属性」设置 SPREADSHEET_ID（或更新 GAS 内 FALLBACK_SPREADSHEET_ID）。';
        }
        showError(msg);
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
