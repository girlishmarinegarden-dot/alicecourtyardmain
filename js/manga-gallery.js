/**
 * 漫画画廊（轻量版，来自 GAS WEB_APP_URL）：
 * - 从 Web App URL 加载 images 列表
 * - NEW 角标：按时间取最近 N 张
 * - 自动分页：每页 PAGE_SIZE 张，动态生成 Page1, Page2...
 * - 预览：点击缩略图弹出大图 overlay
 */
(function () {
    "use strict";

    var PAGE_SIZE = 20;
    var NEW_COUNT = 6;
    var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbySqC0C4UZkouJjOtLp_ExSSLXec0Yh_L_HUxZI3NgvSucJdPoMrM1pAbZlM8VQ8ylkqA/exec";

    var IMAGES = [];
    var loaded = false;
    var loading = false;
    var currentPage = 0;
    var newSet = {};
    var inited = false;

    var gridEl = null;
    var pageIndicatorEl = null;
    var pageBtnsWrap = null;
    var pageBtns = [];
    var loadingEl = null;
    var loadingVideo = null;
    var previewOverlay = null;
    var previewFrame = null;
    var previewClose = null;

    function computeNewSet() {
        newSet = {};
        if (!IMAGES || !IMAGES.length) return;
        var arr = IMAGES.slice().sort(function (a, b) {
            var ta = a.time ? new Date(a.time).getTime() : 0;
            var tb = b.time ? new Date(b.time).getTime() : 0;
            return tb - ta;
        });
        for (var i = 0; i < Math.min(NEW_COUNT, arr.length); i++) {
            var id = arr[i].id;
            if (id) newSet[id] = true;
        }
    }

    function buildDrivePreviewUrl(item) {
        if (!item) return item && item.full ? item.full : "";
        if (item.fileId) {
            return "https://drive.google.com/file/d/" + item.fileId + "/preview";
        }
        return item.full || item.thumb || "";
    }

    function openPreviewByIndex(index) {
        if (!previewOverlay || !previewFrame) return;
        var item = IMAGES[index];
        if (!item) return;
        var src = buildDrivePreviewUrl(item);
        previewFrame.src = src || "";
        previewOverlay.classList.remove("hidden");
        previewOverlay.setAttribute("aria-hidden", "false");
    }

    function closePreview() {
        if (!previewOverlay || !previewFrame) return;
        previewOverlay.classList.add("hidden");
        previewOverlay.setAttribute("aria-hidden", "true");
        previewFrame.src = "";
    }

    function renderPage(pageIndex) {
        if (!gridEl) return;
        var totalPages = Math.max(1, Math.ceil(IMAGES.length / PAGE_SIZE));
        currentPage = Math.max(0, Math.min(pageIndex, totalPages - 1));
        var start = currentPage * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, IMAGES.length);
        gridEl.innerHTML = "";
        for (var i = start; i < end; i++) {
            var item = IMAGES[i];
            if (!item) continue;
            var cell = document.createElement("div");
            cell.className = "manga-thumb";
            cell.dataset.index = String(i);

            var inner = document.createElement("div");
            inner.className = "manga-thumb-inner";
            var img = document.createElement("img");
            img.className = "manga-thumb-img";
            img.src = item.thumb || item.full || item.direct || "";
            img.alt = item.name || item.id || "";
            img.draggable = false;
            inner.appendChild(img);
            cell.appendChild(inner);

            // 标题：使用文件名（去掉扩展名）作为文字标题
            if (item.title) {
                var cap = document.createElement("div");
                cap.className = "manga-thumb-caption";
                cap.textContent = item.title;
                cell.appendChild(cap);
            }

            if (item.id && newSet[item.id]) {
                var badge = document.createElement("span");
                badge.className = "manga-new";
                badge.textContent = "NEW";
                cell.appendChild(badge);
            }

            cell.onclick = function () {
                var idx = parseInt(this.dataset.index, 10);
                if (!isNaN(idx)) openPreviewByIndex(idx);
            };
            gridEl.appendChild(cell);
        }
        if (pageIndicatorEl) {
            pageIndicatorEl.textContent = "第 " + (currentPage + 1) + " / " + totalPages + " 页";
        }
        if (pageBtns && pageBtns.length) {
            for (var j = 0; j < pageBtns.length; j++) {
                var btn = pageBtns[j];
                var p = parseInt(btn.getAttribute("data-page"), 10) || 0;
                if (p === currentPage) btn.classList.add("active");
                else btn.classList.remove("active");
            }
        }
    }

    function buildPageButtons() {
        if (!pageBtnsWrap) return;
        pageBtnsWrap.innerHTML = "";
        pageBtns = [];
        var totalPages = Math.max(1, Math.ceil(IMAGES.length / PAGE_SIZE));
        for (var i = 0; i < totalPages; i++) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "manga-page-btn";
            btn.setAttribute("data-page", String(i));
            btn.textContent = "Page " + (i + 1);
            btn.onclick = (function (pageIndex) {
                return function () {
                    renderPage(pageIndex);
                };
            })(i);
            pageBtnsWrap.appendChild(btn);
            pageBtns.push(btn);
        }
    }

    function initDom() {
        if (inited) return;
        gridEl = document.getElementById("manga-gallery-grid");
        pageIndicatorEl = document.getElementById("manga-page-indicator");
        pageBtnsWrap = document.querySelector(".manga-page-buttons");
        loadingEl = document.getElementById("manga-gallery-loading");
        loadingVideo = document.getElementById("manga-gallery-loading-video");
        previewOverlay = document.getElementById("manga-preview-overlay");
        previewFrame = document.getElementById("manga-preview-frame");
        previewClose = document.getElementById("manga-preview-close");
        if (!gridEl) return;
        if (previewClose) previewClose.onclick = closePreview;
        if (previewOverlay) {
            previewOverlay.addEventListener("click", function (e) {
                if (e.target === previewOverlay) closePreview();
            });
        }
        inited = true;
    }

    function loadData(done) {
        if (loaded) {
            if (typeof done === "function") done();
            return;
        }
        if (loading) return;
        loading = true;
        if (loadingEl) loadingEl.classList.remove("hidden");
        if (loadingVideo) {
            try { loadingVideo.play().catch(function () {}); } catch (e) {}
        }
        if (gridEl) gridEl.classList.add("hidden");
        fetch(WEB_APP_URL)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var list = data && data.images ? data.images : [];
                IMAGES = list.map(function (img) {
                    var name = img.name || "";
                    var title = name.replace(/\.[^.]+$/, "");
                    return {
                        id: img.id || img.name || "",
                        name: name,
                        title: title,
                        fileId: img.id || "",
                        thumb: img.thumb || img.direct || "",
                        full: img.direct || img.thumb || "",
                        time: img.time || ""
                    };
                });
                loaded = true;
                loading = false;
                if (loadingEl) loadingEl.classList.add("hidden");
                if (loadingVideo) { try { loadingVideo.pause(); } catch (e) {} }
                if (gridEl) gridEl.classList.remove("hidden");
                computeNewSet();
                if (typeof done === "function") done();
            })
            .catch(function () {
                loaded = true;
                loading = false;
                if (loadingEl) loadingEl.classList.add("hidden");
                if (loadingVideo) { try { loadingVideo.pause(); } catch (e) {} }
                if (gridEl) gridEl.classList.remove("hidden");
                IMAGES = [];
                computeNewSet();
                if (typeof done === "function") done();
            });
    }

    function show() {
        initDom();
        if (!gridEl) return;
        loadData(function () {
            buildPageButtons();
            renderPage(currentPage || 0);
        });
    }

    window.MangaGallery = {
        show: show
    };
})();

