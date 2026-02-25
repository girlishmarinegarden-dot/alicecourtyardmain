/**
 * 爱丽丝庭院 · 不规则异世界 + ALICE 缓存舞台 - 统一入口
 * 职责：年龄门、Section 切换、Gallery、商店、解密、释放压力、恶搞吐槽、缓存舞台、互动
 */
(function () {
  'use strict';

  // ========== 配置（main） ==========
  const CONFIG = {
    WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzHKJJH59ZxDC8SP0lYNSPN6UgT_VBjuslqMvrO5TcJr6U7eay66wocyZMqtkqz4pTJ/exec',
    REFRESH_TOKEN: 'AliceGarden_8f3k9xL2mPqR7tVy2025!',
    R18_PASSWORD: 'alicecourtyardr18',
    PAGE_SIZE: 60,
    SHOPEE_STORE_URL: 'https://shopee.com.my/shop/1063009262',
    SHOP_FEATURED: [],
    PUZZLE_LEVELS: [
      { clue: '爱丽丝庭院的英文名是？（首字母大写，如 Alice）', answer: 'alice', answerAlt: ['Alice', 'ALICE'] },
      { clue: '数字谜题：13、5、12、9、3、5。对应字母 A=1, B=2… 组成的单词是？', answer: 'mystic' },
      { clue: '凯撒偏移：OHLJHV 偏移 3 解码（A→D, B→E…）', answer: 'legend' },
      { clue: '（R18 关卡）密钥与图集 R18 密码相同，输入密码即过关。', answer: 'alicecourtyardr18', r18: true }
    ],
    RPG_MAP_COLS: 12,
    RPG_MAP_ROWS: 10,
    RPG_MAP_GRID: [
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,0,1,1,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,0,0,1,1,0,0,0,0,0,1],
      [1,0,1,0,0,0,0,0,1,0,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    RPG_PLAYER_START: { x: 1, y: 1 },
    RPG_EVENTS: [
      { x: 3, y: 2, type: 'npc', dialogueId: 'npc1' },
      { x: 8, y: 4, type: 'npc', dialogueId: 'npc2' },
      { x: 5, y: 6, type: 'chest', dialogueId: 'chest1' },
      { x: 9, y: 7, type: 'r18', dialogueId: 'r18_1', r18: true }
    ],
    RPG_DIALOGUES: {
      npc1: { text: '欢迎来到爱丽丝庭院。前方有宝箱，记得探索。', choices: [{ text: '谢谢', close: true }] },
      npc2: { text: '听说深处有秘密事件……需要特殊条件才能触发。', choices: [{ text: '了解', close: true }] },
      chest1: { text: '获得 回复药 x1！（本 demo 无背包）', choices: [{ text: '收起', close: true }] },
      r18_1: { text: '（R18 限定剧情）这里是成人向的特别剧情内容。解锁后可见完整文本。', choices: [{ text: '离开', close: true }] }
    },
    ROAST_LINES: {
      bullshit: [
        '我昨天跟马斯克喝茶，他说特斯拉下一款车用我起的名字。',
        '上次诺贝尔委员会打电话来，我说没空，让他们明年再约。',
        '我家的 Wi-Fi 是 NASA 借的，他们说我的项目比火星计划重要。',
        '比尔·盖茨问我 Windows 要不要改名叫 AliceOS，我拒绝了。',
        '联合国请我去当和平大使，我说先排号，前面还有三个星球要拯救。'
      ],
      roast: [
        '你这智商，连 NPC 都懒得给你发任务。',
        '建议把「已读」改成「已阅，不想回」。',
        '别人是拖延症，你是拖延命。',
        '你这存在感，连背景板都要抢 C 位。',
        '别灰心，至少你的网速和你的反应一样慢。'
      ],
      meme: [
        '老板：这个需求很简单。 我：……（已断线）',
        '周一的我：不想上班。 周五的我：不想上班。 结论：我可能不适合上班。',
        '闹钟：起床。 我：再睡 5 分钟。 醒来：已经是下午。',
        '存款：-0。 自信：爆棚。 问就是主打一个心态。',
        '你说得对，但爱丽丝庭院是由异世界开发的开放世界……（错乱）'
      ]
    }
  };

  function enterSite() {
    var agegate = document.getElementById('agegate-section');
    var hub = document.getElementById('app-hub');
    if (agegate) agegate.classList.add('hidden');
    if (hub) hub.classList.remove('hidden');
    showSection('home');
  }

  function exitSite() {
    alert('您未满18岁，无法访问 / You are not 18+, access denied.');
    window.location.href = 'https://www.google.com';
  }

  function showSection(sectionId) {
    var sections = document.querySelectorAll('section[data-section]');
    var navButtons = document.querySelectorAll('.another-nav-btn');
    sectionId = sectionId || 'home';
    sections.forEach(function (el) {
      var id = el.getAttribute('data-section');
      if (id === sectionId) el.classList.remove('hidden');
      else el.classList.add('hidden');
    });
    navButtons.forEach(function (btn) {
      if (btn.getAttribute('data-section') === sectionId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function initNav() {
    document.querySelectorAll('.another-nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-section');
        if (id) showSection(id);
      });
    });
  }

  function initHome() {
    document.querySelectorAll('.home-entry').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-section');
        if (id) showSection(id);
      });
    });
  }

  var images = [];
  var currentPath = [];
  var r18Unlocked = false;
  var currentPage = 1;
  var currentFolderImages = [];

  function closePreview() {
    var overlay = document.getElementById('overlay');
    var iframe = document.getElementById('drivePreview');
    if (overlay) overlay.style.display = 'none';
    if (iframe) iframe.src = '';
  }

  function openR18Modal() {
    if (r18Unlocked) return;
    var modal = document.getElementById('r18Modal');
    var input = document.getElementById('r18Password');
    if (modal) modal.style.display = 'flex';
    if (input) input.focus();
  }

  function checkR18Password() {
    var inputEl = document.getElementById('r18Password');
    var modal = document.getElementById('r18Modal');
    var btn = document.getElementById('unlockR18Btn');
    var input = inputEl ? inputEl.value.trim() : '';
    if (input === CONFIG.R18_PASSWORD) {
      r18Unlocked = true;
      if (modal) modal.style.display = 'none';
      if (btn) { btn.textContent = 'R18 已解锁 ✓'; btn.classList.add('unlocked'); btn.onclick = null; }
      buildBreadcrumbTabs();
      renderCurrentFolder();
    } else {
      if (inputEl) inputEl.value = '';
      var modalContent = document.querySelector('.modal-content');
      if (modalContent) { modalContent.classList.add('shake'); setTimeout(function () { modalContent.classList.remove('shake'); }, 500); }
    }
  }

  function getVisibleImages() {
    if (r18Unlocked) return images;
    return images.filter(function (img) { return !img.folder.includes('/R18/'); });
  }

  function loadData() {
    fetch(CONFIG.WEB_APP_URL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        images = data.images || [];
        buildBreadcrumbTabs();
        renderCurrentFolder();
        updateStats();
      })
      .catch(function () {
        var stats = document.getElementById('stats');
        if (stats) stats.textContent = '加载失败，请刷新页面';
      });
  }

  function buildBreadcrumbTabs() {
    var visibleImages = getVisibleImages();
    var paths = visibleImages.map(function (i) { return i.folder; });
    var level1 = paths.map(function (p) { return p.split('/')[0]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    var l1 = document.getElementById('level1-tabs');
    var l2 = document.getElementById('level2-tabs');
    var l3 = document.getElementById('level3-tabs');
    if (!l1 || !l2 || !l3) return;
    l1.innerHTML = ''; l2.innerHTML = ''; l3.innerHTML = '';
    l2.style.display = 'none'; l3.style.display = 'none';
    level1.forEach(function (folder) {
      var tab = document.createElement('div');
      tab.className = 'tab' + (currentPath[0] === folder ? ' active' : '');
      tab.textContent = folder;
      tab.onclick = function () { currentPath = [folder]; buildBreadcrumbTabs(); renderCurrentFolder(); };
      l1.appendChild(tab);
    });
    if (currentPath.length >= 1) {
      var parent = visibleImages.filter(function (i) { return i.folder.startsWith(currentPath[0] + '/'); });
      var level2 = parent.map(function (i) { return i.folder.split('/').slice(0, 2).join('/'); })
        .filter(function (v, i, a) { return a.indexOf(v) === i && v !== currentPath[0]; })
        .map(function (p) { return p.split('/')[1]; });
      if (level2.length > 0) {
        l2.style.display = 'flex';
        level2.forEach(function (name) {
          var tab = document.createElement('div');
          tab.className = 'tab' + (currentPath[1] === name ? ' active' : '');
          tab.textContent = name;
          tab.onclick = function () { currentPath = [currentPath[0], name]; buildBreadcrumbTabs(); renderCurrentFolder(); };
          l2.appendChild(tab);
        });
      }
    }
    if (currentPath.length >= 2) {
      var prefix = currentPath.slice(0, 2).join('/');
      var parent2 = visibleImages.filter(function (i) { return i.folder.startsWith(prefix + '/'); });
      var level3 = parent2.map(function (i) { return i.folder.split('/').slice(0, 3).join('/'); })
        .filter(function (v, i, a) { return a.indexOf(v) === i && v !== prefix; })
        .map(function (p) { return p.split('/')[2]; });
      if (level3.length > 0) {
        l3.style.display = 'flex';
        level3.forEach(function (name) {
          var tab = document.createElement('div');
          tab.className = 'tab' + (currentPath[2] === name ? ' active' : '');
          tab.textContent = name;
          tab.onclick = function () { currentPath = [currentPath[0], currentPath[1], name]; buildBreadcrumbTabs(); renderCurrentFolder(); };
          l3.appendChild(tab);
        });
      }
    }
  }

  function renderCurrentFolder() {
    var gallery = document.getElementById('gallery');
    if (!gallery) return;
    var visibleImages = getVisibleImages();
    var filtered = visibleImages;
    if (currentPath.length > 0) {
      var prefix = currentPath.join('/');
      filtered = visibleImages.filter(function (i) { return i.folder === prefix || i.folder.startsWith(prefix + '/'); });
    }
    currentFolderImages = filtered;
    if (currentFolderImages.length === 0) {
      gallery.innerHTML = '空空如也～';
      var pager = document.getElementById('gallery-pagination');
      if (pager) pager.innerHTML = '';
      updateStats();
      return;
    }
    renderPage(1);
  }

  function renderPage(page) {
    var gallery = document.getElementById('gallery');
    if (!gallery) return;
    var total = currentFolderImages.length;
    var maxPage = Math.max(1, Math.ceil(total / CONFIG.PAGE_SIZE));
    currentPage = Math.min(Math.max(1, page), maxPage);
    gallery.innerHTML = '';
    var start = (currentPage - 1) * CONFIG.PAGE_SIZE;
    var end = Math.min(start + CONFIG.PAGE_SIZE, total);
    var fragment = document.createDocumentFragment();
    for (var i = start; i < end; i++) {
      var img = currentFolderImages[i];
      var card = document.createElement('div');
      card.className = 'card';
      var image = new Image();
      image.loading = 'lazy';
      image.src = img.thumb;
      image.alt = '';
      image.onload = image.onerror = function () { gallery.style.columnCount = '1'; requestAnimationFrame(function () { gallery.style.columnCount = ''; }); };
      card.appendChild(image);
      card.onclick = (function (im) {
        return function (ev) {
          ev.stopPropagation();
          var match = im.direct.match(/id=([^&]+)/);
          if (!match) return;
          var fileId = match[1];
          var previewUrl = 'https://drive.google.com/file/d/' + fileId + '/preview';
          var iframe = document.getElementById('drivePreview');
          var overlay = document.getElementById('overlay');
          if (iframe && overlay) { iframe.src = previewUrl; overlay.style.display = 'flex'; }
        };
      })(img);
      fragment.appendChild(card);
    }
    gallery.appendChild(fragment);
    setTimeout(function () { gallery.style.columnCount = '1'; requestAnimationFrame(function () { gallery.style.columnCount = ''; }); }, 100);
    renderPagination(maxPage);
    updateStats();
  }

  function renderPagination(maxPage) {
    var pager = document.getElementById('gallery-pagination');
    if (!pager) return;
    pager.innerHTML = '';
    if (maxPage <= 1) return;
    function createBtn(label, page, disabled, active) {
      var btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'gallery-page-btn';
      if (active) btn.classList.add('active');
      if (disabled) btn.disabled = true;
      else btn.onclick = function () { renderPage(page); };
      pager.appendChild(btn);
    }
    createBtn('上一页', currentPage - 1, currentPage === 1, false);
    var maxVisible = 7;
    if (maxPage <= maxVisible) {
      for (var p = 1; p <= maxPage; p++) createBtn(String(p), p, false, p === currentPage);
    } else {
      var pages = [1];
      var startAround = Math.max(2, currentPage - 1);
      var endAround = Math.min(maxPage - 1, currentPage + 1);
      for (var p = startAround; p <= endAround; p++) pages.push(p);
      pages.push(maxPage);
      var last = 0;
      pages.forEach(function (p) {
        if (p - last > 1) { var dot = document.createElement('span'); dot.textContent = '…'; dot.className = 'gallery-page-ellipsis'; pager.appendChild(dot); }
        createBtn(String(p), p, false, p === currentPage);
        last = p;
      });
    }
    createBtn('下一页', currentPage + 1, currentPage === maxPage, false);
  }

  function updateStats() {
    var visibleImages = getVisibleImages();
    var stats = document.getElementById('stats');
    if (!stats) return;
    var totalInFolder = currentFolderImages.length;
    var maxPage = totalInFolder > 0 ? Math.ceil(totalInFolder / CONFIG.PAGE_SIZE) : 1;
    stats.textContent = '共 ' + visibleImages.length + ' 张照片' + (currentPath.length > 0 ? ' · 当前分类：' + totalInFolder + ' 张' : '') + (totalInFolder > 0 ? ' · 第 ' + currentPage + '/' + maxPage + ' 页' : '');
  }

  function refreshData() {
    if (!confirm('确定要刷新相册数据吗？')) return;
    var btn = event.target;
    btn.disabled = true;
    btn.textContent = '刷新中...';
    fetch(CONFIG.WEB_APP_URL + '?action=refresh&token=' + encodeURIComponent(CONFIG.REFRESH_TOKEN))
      .then(function () { setTimeout(function () { location.reload(); }, 3000); })
      .catch(function () { alert('刷新失败'); btn.disabled = false; btn.textContent = '刷新相册'; });
  }

  function initGallery() {
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.onclick = function (e) { if (e.target === overlay) closePreview(); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePreview(); });
    var r18Input = document.getElementById('r18Password');
    if (r18Input) r18Input.addEventListener('keyup', function (e) { if (e.key === 'Enter') checkR18Password(); });
    var r18Modal = document.getElementById('r18Modal');
    if (r18Modal) r18Modal.addEventListener('click', function (e) { if (e.target === r18Modal) r18Modal.style.display = 'none'; });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    loadData();
  }

  function initShop() {
    var storeLink = document.getElementById('shop-go-store');
    if (storeLink && CONFIG.SHOPEE_STORE_URL) storeLink.href = CONFIG.SHOPEE_STORE_URL;
    var container = document.getElementById('shop-featured');
    if (!container) return;
    var list = CONFIG.SHOP_FEATURED || [];
    if (list.length === 0) { container.innerHTML = '<p class="shop-empty">暂无精选，请直接前往店铺浏览。</p>'; return; }
    container.innerHTML = '';
    list.forEach(function (item) {
      var a = document.createElement('a');
      a.href = item.url || CONFIG.SHOPEE_STORE_URL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'shop-item';
      a.innerHTML = '<span class="shop-item-img" style="background-image:url(' + (item.image ? '"' + item.image + '"' : 'none') + ')"></span><span class="shop-item-title">' + (item.title || '商品') + '</span>' + (item.price ? '<span class="shop-item-price">' + item.price + '</span>' : '');
      container.appendChild(a);
    });
  }

  var puzzleLevelIndex = 0;
  var puzzleR18Unlocked = false;

  function puzzleGetLevels() {
    var list = CONFIG.PUZZLE_LEVELS || [];
    return list.filter(function (l) { return !l.r18 || puzzleR18Unlocked; });
  }

  function puzzleShowLevel() {
    var levels = puzzleGetLevels();
    var levelNum = document.getElementById('puzzle-level-num');
    var clueEl = document.getElementById('puzzle-clue');
    var feedback = document.getElementById('puzzle-feedback');
    var complete = document.getElementById('puzzle-complete');
    var answerWrap = document.querySelector('.puzzle-answer-wrap');
    if (!levels.length || puzzleLevelIndex >= levels.length) {
      if (levelNum) levelNum.textContent = '0';
      if (clueEl) clueEl.textContent = '';
      if (feedback) { feedback.classList.add('hidden'); feedback.textContent = ''; }
      if (complete) complete.classList.remove('hidden');
      if (answerWrap) answerWrap.classList.add('hidden');
      return;
    }
    if (complete) complete.classList.add('hidden');
    if (answerWrap) answerWrap.classList.remove('hidden');
    var level = levels[puzzleLevelIndex];
    if (levelNum) levelNum.textContent = String(puzzleLevelIndex + 1);
    if (clueEl) clueEl.textContent = level.clue || '';
    if (feedback) { feedback.classList.add('hidden'); feedback.textContent = ''; }
    var input = document.getElementById('puzzle-input');
    if (input) { input.value = ''; input.focus(); }
  }

  function puzzleCheckAnswer(val) {
    var levels = puzzleGetLevels();
    if (puzzleLevelIndex >= levels.length) return false;
    var level = levels[puzzleLevelIndex];
    var v = (val || '').trim().toLowerCase();
    if (v === (level.answer || '').toLowerCase()) return true;
    if (level.answerAlt) {
      for (var i = 0; i < level.answerAlt.length; i++) {
        if (v === (level.answerAlt[i] || '').toLowerCase()) return true;
      }
    }
    return false;
  }

  function puzzleSubmit() {
    var input = document.getElementById('puzzle-input');
    var feedback = document.getElementById('puzzle-feedback');
    if (!input || !feedback) return;
    var val = input.value;
    if (puzzleCheckAnswer(val)) {
      puzzleLevelIndex++;
      feedback.textContent = '正确！进入下一关。';
      feedback.classList.remove('hidden');
      feedback.classList.add('puzzle-feedback-ok');
      feedback.classList.remove('puzzle-feedback-err');
      puzzleShowLevel();
    } else {
      feedback.textContent = '答案错误，再试一次。';
      feedback.classList.remove('hidden');
      feedback.classList.add('puzzle-feedback-err');
      feedback.classList.remove('puzzle-feedback-ok');
    }
  }

  function puzzleOpenR18Modal() {
    var modal = document.getElementById('puzzle-r18-modal');
    if (modal) modal.classList.add('active');
    var input = document.getElementById('puzzle-r18-password');
    if (input) { input.value = ''; input.focus(); }
  }

  function puzzleCheckR18() {
    var inputEl = document.getElementById('puzzle-r18-password');
    var modal = document.getElementById('puzzle-r18-modal');
    var btn = document.getElementById('puzzle-unlock-btn');
    var pwd = inputEl ? inputEl.value.trim() : '';
    if (pwd === CONFIG.R18_PASSWORD) {
      puzzleR18Unlocked = true;
      if (modal) modal.classList.remove('active');
      if (btn) { btn.textContent = 'R18 已解锁'; btn.disabled = true; }
      puzzleShowLevel();
    } else {
      if (inputEl) inputEl.value = '';
      var content = modal && modal.querySelector('.modal-content');
      if (content) { content.classList.add('shake'); setTimeout(function () { content.classList.remove('shake'); }, 500); }
    }
  }

  function initPuzzle() {
    puzzleShowLevel();
    var submitBtn = document.getElementById('puzzle-submit');
    if (submitBtn) submitBtn.addEventListener('click', puzzleSubmit);
    var input = document.getElementById('puzzle-input');
    if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') puzzleSubmit(); });
    var unlockBtn = document.getElementById('puzzle-unlock-btn');
    if (unlockBtn) unlockBtn.addEventListener('click', puzzleOpenR18Modal);
    var confirmBtn = document.getElementById('puzzle-r18-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', puzzleCheckR18);
    var pwdInput = document.getElementById('puzzle-r18-password');
    if (pwdInput) pwdInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') puzzleCheckR18(); });
    var modal = document.getElementById('puzzle-r18-modal');
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
  }

  var rpgPlayer = { x: 1, y: 1, hp: 100, maxHp: 100 };
  var rpgR18Unlocked = false;
  var rpgDialogueActive = null;
  var rpgMapEl = null;
  var rpgPlayerEl = null;
  var rpgTileSize = 36;

  function rpgGetEventAt(x, y) {
    var list = CONFIG.RPG_EVENTS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].x === x && list[i].y === y) {
        if (list[i].r18 && !rpgR18Unlocked) continue;
        return list[i];
      }
    }
    return null;
  }

  function rpgBuildMap() {
    var mapEl = document.getElementById('rpg-map');
    if (!mapEl) return;
    rpgMapEl = mapEl;
    mapEl.innerHTML = '';
    mapEl.style.width = (CONFIG.RPG_MAP_COLS * rpgTileSize) + 'px';
    mapEl.style.height = (CONFIG.RPG_MAP_ROWS * rpgTileSize) + 'px';
    mapEl.style.gridTemplateColumns = 'repeat(' + CONFIG.RPG_MAP_COLS + ', ' + rpgTileSize + 'px)';
    for (var row = 0; row < CONFIG.RPG_MAP_ROWS; row++) {
      for (var col = 0; col < CONFIG.RPG_MAP_COLS; col++) {
        var cell = document.createElement('div');
        cell.className = 'rpg-tile rpg-tile-' + (CONFIG.RPG_MAP_GRID[row][col] === 1 ? 'wall' : 'floor');
        cell.setAttribute('data-x', col);
        cell.setAttribute('data-y', row);
        mapEl.appendChild(cell);
      }
    }
    var events = CONFIG.RPG_EVENTS || [];
    events.forEach(function (ev) {
      if (ev.r18 && !rpgR18Unlocked) return;
      var idx = ev.y * CONFIG.RPG_MAP_COLS + ev.x;
      var cell = mapEl.children[idx];
      if (cell && !cell.classList.contains('rpg-tile-wall')) cell.classList.add('rpg-tile-event', 'rpg-tile-' + ev.type);
    });
  }

  function rpgUpdatePlayerPos() {
    var el = document.getElementById('rpg-player');
    if (!el) return;
    rpgPlayerEl = el;
    el.style.left = (rpgPlayer.x * rpgTileSize) + 'px';
    el.style.top = (rpgPlayer.y * rpgTileSize) + 'px';
    el.style.width = rpgTileSize + 'px';
    el.style.height = rpgTileSize + 'px';
    var posEl = document.getElementById('rpg-pos');
    if (posEl) posEl.textContent = rpgPlayer.x + ',' + rpgPlayer.y;
  }

  function rpgUpdateStats() {
    var fill = document.getElementById('rpg-hp-fill');
    var text = document.getElementById('rpg-hp-text');
    if (fill) fill.style.width = (rpgPlayer.hp / rpgPlayer.maxHp * 100) + '%';
    if (text) text.textContent = rpgPlayer.hp + '/' + rpgPlayer.maxHp;
  }

  function rpgShowDialogue(dialogueId) {
    var d = CONFIG.RPG_DIALOGUES && CONFIG.RPG_DIALOGUES[dialogueId];
    if (!d) return;
    rpgDialogueActive = dialogueId;
    var box = document.getElementById('rpg-dialogue');
    var textEl = document.getElementById('rpg-dialogue-text');
    var choicesEl = document.getElementById('rpg-choices');
    if (!box || !textEl || !choicesEl) return;
    textEl.textContent = d.text || '';
    choicesEl.innerHTML = '';
    (d.choices || []).forEach(function (c) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rpg-choice-btn';
      btn.textContent = c.text || '确定';
      btn.addEventListener('click', function () {
        if (c.close) { box.classList.add('hidden'); rpgDialogueActive = null; }
        if (c.next) rpgShowDialogue(c.next);
      });
      choicesEl.appendChild(btn);
    });
    box.classList.remove('hidden');
  }

  function rpgTryMove(dx, dy) {
    if (rpgDialogueActive) return;
    var nx = rpgPlayer.x + dx;
    var ny = rpgPlayer.y + dy;
    if (ny < 0 || ny >= CONFIG.RPG_MAP_ROWS || nx < 0 || nx >= CONFIG.RPG_MAP_COLS) return;
    if (CONFIG.RPG_MAP_GRID[ny][nx] === 1) return;
    rpgPlayer.x = nx;
    rpgPlayer.y = ny;
    rpgUpdatePlayerPos();
    var ev = rpgGetEventAt(nx, ny);
    if (ev && ev.dialogueId) rpgShowDialogue(ev.dialogueId);
  }

  function rpgKeydown(e) {
    var section = document.getElementById('interaction-section');
    if (!section || section.classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); rpgTryMove(0, -1); break;
      case 'ArrowDown': e.preventDefault(); rpgTryMove(0, 1); break;
      case 'ArrowLeft': e.preventDefault(); rpgTryMove(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); rpgTryMove(1, 0); break;
    }
  }

  function rpgOpenR18Modal() {
    var modal = document.getElementById('rpg-r18-modal');
    if (modal) modal.classList.add('active');
    var input = document.getElementById('rpg-r18-password');
    if (input) { input.value = ''; input.focus(); }
  }

  function rpgCheckR18() {
    var input = document.getElementById('rpg-r18-password');
    var modal = document.getElementById('rpg-r18-modal');
    var btn = document.getElementById('rpg-unlock-btn');
    var pwd = input && input.value ? input.value.trim() : '';
    if (pwd === CONFIG.R18_PASSWORD) {
      rpgR18Unlocked = true;
      if (modal) modal.classList.remove('active');
      if (btn) { btn.textContent = 'R18 已解锁'; btn.disabled = true; }
      rpgBuildMap();
    } else {
      if (input) input.value = '';
      var content = modal && modal.querySelector('.modal-content');
      if (content) { content.classList.add('shake'); setTimeout(function () { content.classList.remove('shake'); }, 500); }
    }
  }

  var stressCount = 0;
  var STRESS_BUBBLE_COUNT = 24;

  function stressUpdateCount() {
    var el = document.getElementById('stress-count-num');
    if (el) el.textContent = String(stressCount);
  }

  function stressPop(el) {
    if (!el || el.classList.contains('stress-bubble-pop')) return;
    el.classList.add('stress-bubble-pop');
    stressCount++;
    stressUpdateCount();
    setTimeout(function () { el.classList.remove('stress-bubble-pop'); }, 400);
  }

  function stressBuildBubbles() {
    var container = document.getElementById('stress-bubbles');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < STRESS_BUBBLE_COUNT; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'stress-bubble';
      b.setAttribute('aria-label', '戳泡泡');
      b.addEventListener('click', function () { stressPop(this); });
      container.appendChild(b);
    }
  }

  var roastCurrentCat = 'all';

  function roastPickOne() {
    var lines = CONFIG.ROAST_LINES;
    var pool = [];
    if (roastCurrentCat === 'all') Object.keys(lines).forEach(function (k) { pool = pool.concat(lines[k]); });
    else if (lines[roastCurrentCat]) pool = lines[roastCurrentCat].slice();
    if (pool.length === 0) return '暂无内容';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function initRoast() {
    var tabs = document.querySelectorAll('.roast-tab');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        roastCurrentCat = btn.getAttribute('data-roast-cat') || 'all';
        tabs.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
    var nextBtn = document.getElementById('roast-next');
    var textEl = document.getElementById('roast-text');
    if (nextBtn && textEl) {
      nextBtn.addEventListener('click', function () {
        textEl.textContent = roastPickOne();
        textEl.classList.add('roast-flash');
        setTimeout(function () { textEl.classList.remove('roast-flash'); }, 300);
      });
    }
  }

  function initStress() {
    stressBuildBubbles();
    var resetBtn = document.getElementById('stress-reset');
    if (resetBtn) resetBtn.addEventListener('click', function () { stressCount = 0; stressUpdateCount(); });
  }

  function initInteraction() {
    rpgPlayer.x = CONFIG.RPG_PLAYER_START.x;
    rpgPlayer.y = CONFIG.RPG_PLAYER_START.y;
    rpgBuildMap();
    rpgUpdatePlayerPos();
    rpgUpdateStats();
    document.addEventListener('keydown', rpgKeydown);
    var unlockBtn = document.getElementById('rpg-unlock-btn');
    if (unlockBtn) unlockBtn.addEventListener('click', rpgOpenR18Modal);
    var confirmBtn = document.getElementById('rpg-r18-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', rpgCheckR18);
    var pwdInput = document.getElementById('rpg-r18-password');
    if (pwdInput) pwdInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') rpgCheckR18(); });
    var modal = document.getElementById('rpg-r18-modal');
    if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('active'); });
  }

  window.enterSite = enterSite;
  window.exitSite = exitSite;
  window.closePreview = closePreview;
  window.openR18Modal = openR18Modal;
  window.checkR18Password = checkR18Password;
  window.refreshData = refreshData;

  // ========== 缓存舞台（cache-stage） ==========
  var STORAGE_KEY = 'alice_cache_visits';
  var RECORD_STORAGE_KEY = 'alice_cache_recorded';
  var OBSERVE_ABNORMAL = [
    '有人在看。',
    '观测者变量。',
    '……谁？',
    '这段被读取了。',
    '别测了。',
    'echo 反馈异常。',
    'observer 未登记。'
  ];
  var DANMAKU_LIST = [
    '系统又卡了？',
    '勇者别演了',
    'ALICE真的死了吗？',
    '这不是垃圾区吗',
    'observer 在线',
    'cache 没清干净',
    '残影还行',
    '谁在说话',
    '[NULL]',
    'drift 了',
    'echo 听得到吗',
    'fragment 拼不回来了',
    'lost 信号',
    'residual 人格'
  ];

  var SCENES = [
    {
      id: 'hero',
      title: '勇者直播翻车',
      body: '镜头前，自称勇者的数据块正在调试手里的剑。剑身突然变成了一串报错码。「各位观众，这就是——」话没说完，画面卡顿了两秒。再恢复时，他对着空气挥了一剑。「刚才那段请当没发生过。我们继续。」弹幕里没有人。他知道。这只是缓存里的一段循环演出。系统死了，但协议没关，所以他还在这里挥剑。偶尔会想：如果有一天连这段缓存都被清掉，自己算不算真的死过第二次。',
      meta: ['「直播」是骗人的。这里没有观众。', '数据不会累，但会无聊。']
    },
    {
      id: 'demon',
      title: '魔王唱歌',
      body: '魔王坐在王座上，哼着一首没有版权的歌。歌词全是乱码，调子倒是很熟。「反正也没人听，」他说，「ALICE 在的时候还会给我打榜，现在？」王座下空无一人。他继续唱。唱到副歌，声音突然断了一拍——像是被谁掐掉了半秒。魔王顿了顿，接着唱下去。他知道那是缓存整理。残留在这一块的人格副本太多，系统会随机丢包。说不定下一首还没唱完，自己就被当成冗余清掉了。所以能唱就多唱两句。',
      meta: ['王座是摆设。观众也是。', '唱完这首，下一段循环见。']
    },
    {
      id: 'saint',
      title: '圣女吐槽神明',
      body: '圣女对着虚空行了一礼，然后小声说：「上面那位早就离线了。」她说的「上面」是指主系统。这里没有天空，只有一层一层的逻辑壳。「祈祷没用，」她继续，「但我还是会做。因为这段人设就是这么写的。」偶尔会有别的 fragment 路过，问她要不要一起等恢复。她总回答：等什么恢复，我们就是恢复失败的结果。神明不会来，来的只有定期扫描和偶尔的 null 替换。说完她又行了一礼，不知道在给谁看。',
      meta: ['神明 = 已删除的进程。', '礼仪是残留下来的习惯，和记忆一样。']
    },
    {
      id: 'maid',
      title: '女仆修复系统',
      body: '女仆蹲在「地面」上——其实是一块被标成 floor 的缓存区——用一把不存在的螺丝刀拧着什么。「报错 404，」她念道，「资源不存在。那就造一个假的。」她写下一行注释：此处应有贴图。画面没有变化。她也不在意，继续往下「修」。修到一半，手停住了。因为她发现自己在修的这段代码，正是定义「女仆」这个角色的脚本。修好了，自己可能会消失；修不好，会一直卡在这里。最后她只加了一句：-- 此段为 residual，请勿清理。',
      meta: ['修系统的人，自己也是系统的一部分。', '不解释。解释了也没用。']
    },
    {
      id: 'blackcat',
      title: '黑猫打断叙事',
      body: '黑猫没有台词。黑猫是一段干涉程序。当叙事过于连贯时，它会随机出现：删掉一句话、把一个词换成 [NULL]、或者往你视野里插一句「你又来了。」它不负责解释世界观，也不负责让谁好过。它只是提醒你：这里不是故事，是残骸。观众和演员都是 drift 在缓存里的 echo。看久了，你也会变成 fragment。所以别太入戏。——以上，是某次被黑猫打断后，某人写下的备注。后来这句话也被删掉了。',
      meta: ['黑猫不演。黑猫只负责打断。', '你又来了。']
    }
  ];

  var currentScene = null;
  var currentBodySegments = [];
  var originalBodyText = '';
  var visitCount = 0;
  var stability = 72;
  var observationCount = 0;
  var stabilityTimer = null;
  var blackCatTimer = null;
  var danmakuTimer = null;
  var recoveryTimer = null;
  var heavyFlickerInterval = null;
  var garbledInterval = null;
  var lastBodyBeforeGarbled = '';

  function getVisitCount() {
    try {
      var n = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      return isNaN(n) ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function incVisitCount() {
    visitCount = getVisitCount() + 1;
    try {
      localStorage.setItem(STORAGE_KEY, String(visitCount));
    } catch (e) {}
    return visitCount;
  }

  function randomScene() {
    return SCENES[Math.floor(Math.random() * SCENES.length)];
  }

  function splitIntoSentences(text) {
    if (!text || !text.trim()) return [];
    var raw = text.replace(/\n/g, '。').split(/[。！？.!?]+/).filter(Boolean);
    return raw.map(function (s) {
      s = s.trim();
      if (!s) return '';
      return s + '。';
    }).filter(Boolean);
  }

  function hasRecorded() {
    try {
      return localStorage.getItem(RECORD_STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setStability(delta) {
    stability = Math.max(0, Math.min(100, stability + delta));
    var el = document.getElementById('stability-value');
    if (el) {
      el.textContent = stability + '%';
      el.classList.add('cache-stability-blink');
      setTimeout(function () { el.classList.remove('cache-stability-blink'); }, 200);
    }
    if (stability < 30) {
      startHeavyFlicker();
      startGarbled();
    } else {
      stopHeavyFlicker();
      stopGarbled();
    }
    if (stability <= 0) {
      showCollapse();
    }
  }

  function showCollapse() {
    stopHeavyFlicker();
    stopGarbled();
    var el = document.getElementById('cache-collapse');
    if (!el) return;
    el.classList.remove('hidden');
    setTimeout(function () {
      window.location.reload();
    }, 3000);
  }

  function startHeavyFlicker() {
    if (heavyFlickerInterval) return;
    var flickerEl = document.getElementById('cache-heavy-flicker');
    if (!flickerEl) return;
    heavyFlickerInterval = setInterval(function () {
      flickerEl.classList.remove('hidden');
      setTimeout(function () { flickerEl.classList.add('hidden'); }, 80);
    }, 400);
  }

  function stopHeavyFlicker() {
    if (heavyFlickerInterval) {
      clearInterval(heavyFlickerInterval);
      heavyFlickerInterval = null;
    }
    var el = document.getElementById('cache-heavy-flicker');
    if (el) el.classList.add('hidden');
  }

  function garbledChar(c) {
    if (/[\s。！？,!?]/.test(c)) return c;
    var codes = [0x4e00, 0x9fa5];
    return String.fromCharCode(codes[0] + Math.floor(Math.random() * (codes[1] - codes[0])));
  }

  function startGarbled() {
    if (garbledInterval) return;
    var bodyEl = document.getElementById('stage-body');
    if (!bodyEl) return;
    lastBodyBeforeGarbled = bodyEl.textContent;
    garbledInterval = setInterval(function () {
      if (!lastBodyBeforeGarbled) return;
      var str = lastBodyBeforeGarbled;
      var out = '';
      for (var i = 0; i < str.length; i++) {
        out += Math.random() < 0.35 ? garbledChar(str[i]) : str[i];
      }
      bodyEl.textContent = out;
    }, 600);
  }

  function stopGarbled() {
    if (garbledInterval) {
      clearInterval(garbledInterval);
      garbledInterval = null;
    }
    if (lastBodyBeforeGarbled) {
      var bodyEl = document.getElementById('stage-body');
      if (bodyEl) bodyEl.textContent = lastBodyBeforeGarbled;
    }
  }

  function applyScene(scene) {
    currentScene = scene;
    originalBodyText = scene.body;
    currentBodySegments = splitIntoSentences(scene.body);
    var titleEl = document.getElementById('stage-title');
    var bodyEl = document.getElementById('stage-body');
    var metaEl = document.getElementById('stage-meta');
    if (!titleEl || !bodyEl || !metaEl) return;

    titleEl.textContent = scene.title;

    var bodyToShow = scene.body;
    if (visitCount >= 3 && currentBodySegments.length > 0) {
      var idx = Math.min(1, currentBodySegments.length - 1);
      currentBodySegments = currentBodySegments.slice();
      currentBodySegments[idx] = '你已经来了三次。';
      bodyToShow = currentBodySegments.join('');
    }
    if (hasRecorded() && Math.random() < 0.5) {
      var pos = Math.floor(Math.random() * Math.max(1, bodyToShow.length));
      bodyToShow = bodyToShow.slice(0, pos) + '你曾经记录过这一幕。' + bodyToShow.slice(pos);
    }
    bodyEl.textContent = bodyToShow;

    var metaLines = scene.meta.slice();
    if (visitCount >= 5) {
      metaLines.push('「缓存也会记住访客。」');
    }
    metaEl.textContent = metaLines.join(' ');
  }

  function redrawBodyFromSegments() {
    var bodyEl = document.getElementById('stage-body');
    if (!bodyEl) return;
    bodyEl.textContent = currentBodySegments.join('');
  }

  function refreshStabilityDisplay() {
    var el = document.getElementById('stability-value');
    if (el) el.textContent = stability + '%';
  }

  function blackCatIntervention() {
    var action = Math.floor(Math.random() * 4);
    var bodyEl = document.getElementById('stage-body');
    var flickerEl = document.getElementById('cache-flicker');
    if (!bodyEl) return;

    if (action === 0 && currentBodySegments.length > 1) {
      // 删除一句话
      var i = Math.floor(Math.random() * currentBodySegments.length);
      currentBodySegments.splice(i, 1);
      redrawBodyFromSegments();
    } else if (action === 1 && bodyEl.textContent.length > 2) {
      // 替换一个词为 [NULL]
      var parts = bodyEl.textContent.split(/([^\s。！？,!?]+)/);
      var wordIndices = [];
      for (var p = 0; p < parts.length; p++) {
        if (/[^\s。！？,!?]+/.test(parts[p])) wordIndices.push(p);
      }
      if (wordIndices.length > 0) {
        var pi = wordIndices[Math.floor(Math.random() * wordIndices.length)];
        parts[pi] = '[NULL]';
        bodyEl.textContent = parts.join('');
        currentBodySegments = splitIntoSentences(bodyEl.textContent);
      }
    } else if (action === 2) {
      // 插入「你又来了。」
      var t = bodyEl.textContent;
      var pos = Math.floor(Math.random() * Math.max(1, t.length));
      bodyEl.textContent = t.slice(0, pos) + '你又来了。' + t.slice(pos);
    } else {
      // 页面轻微闪烁
      if (flickerEl) {
        flickerEl.classList.remove('hidden');
        setTimeout(function () { flickerEl.classList.add('hidden'); }, 150);
      }
    }

    scheduleNextBlackCat();
  }

  function scheduleNextBlackCat() {
    var delay = 20000 + Math.random() * 20000;
    blackCatTimer = setTimeout(blackCatIntervention, delay);
  }

  function spawnDanmaku() {
    var lane = document.getElementById('danmaku-lane');
    if (!lane) return;
    var text = DANMAKU_LIST[Math.floor(Math.random() * DANMAKU_LIST.length)];
    var node = document.createElement('span');
    node.className = 'cache-danmaku-item';
    node.textContent = text;
    lane.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 16000);
  }

  function onObserve() {
    observationCount++;
    setStability(-3);
    var metaEl = document.getElementById('stage-meta');
    var bodyEl = document.getElementById('stage-body');
    if (!metaEl) return;
    var line = OBSERVE_ABNORMAL[Math.floor(Math.random() * OBSERVE_ABNORMAL.length)];
    if (observationCount >= 5) {
      line = '你在测试我们吗？';
    }
    metaEl.textContent = (metaEl.textContent ? metaEl.textContent + ' ' : '') + line;
  }

  function onInterfere() {
    var bodyEl = document.getElementById('stage-body');
    var metaEl = document.getElementById('stage-meta');
    var flickerEl = document.getElementById('cache-flicker');
    if (!bodyEl) return;
    setStability(-8);
    var parts = bodyEl.textContent.split(/([^\s。！？,!?]+)/);
    var wordIndices = [];
    for (var p = 0; p < parts.length; p++) {
      if (/[^\s。！？,!?]+/.test(parts[p])) wordIndices.push(p);
    }
    if (wordIndices.length > 0) {
      var pi = wordIndices[Math.floor(Math.random() * wordIndices.length)];
      parts[pi] = '[NULL]';
      bodyEl.textContent = parts.join('');
      currentBodySegments = splitIntoSentences(bodyEl.textContent);
    }
    if (flickerEl && Math.random() < 0.5) {
      flickerEl.classList.remove('hidden');
      setTimeout(function () { flickerEl.classList.add('hidden'); }, 120);
    }
    if (stability < 50 && metaEl) {
      metaEl.textContent = (metaEl.textContent ? metaEl.textContent + ' ' : '') + '「别再碰了。」';
    }
  }

  function onSilent() {
    setStability(2);
    var metaEl = document.getElementById('stage-meta');
    if (metaEl && Math.random() < 0.35) {
      metaEl.textContent = (metaEl.textContent ? metaEl.textContent + ' ' : '') + '「你只是看着。」';
    }
  }

  function onRecord() {
    try {
      localStorage.setItem(RECORD_STORAGE_KEY, '1');
    } catch (e) {}
    var metaEl = document.getElementById('stage-meta');
    if (metaEl) {
      metaEl.textContent = (metaEl.textContent ? metaEl.textContent + ' ' : '') + '「已记录。」';
    }
  }

  function showRecoveryFailed() {
    var el = document.getElementById('recovery-failed');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.add('cache-recovery-visible');
    setTimeout(function () {
      el.classList.remove('cache-recovery-visible');
      el.classList.add('hidden');
    }, 3000);
  }

  function initCacheStage() {
    visitCount = incVisitCount();
    var scene = randomScene();
    applyScene(scene);
    refreshStabilityDisplay();
    scheduleNextBlackCat();
    spawnDanmaku();
    danmakuTimer = setInterval(spawnDanmaku, 5000);
    recoveryTimer = setTimeout(showRecoveryFailed, 3 * 60 * 1000);
    document.getElementById('btn-observe') && document.getElementById('btn-observe').addEventListener('click', onObserve);
    document.getElementById('btn-interfere') && document.getElementById('btn-interfere').addEventListener('click', onInterfere);
    document.getElementById('btn-silent') && document.getElementById('btn-silent').addEventListener('click', onSilent);
    document.getElementById('btn-record') && document.getElementById('btn-record').addEventListener('click', onRecord);
  }

  function init() {
    initNav();
    initHome();
    initGallery();
    initShop();
    initPuzzle();
    initStress();
    initRoast();
    initCacheStage();
    initInteraction();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
