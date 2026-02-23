/**
 * 记忆 · 拍照场地：点击容器显示「移动」「Edit」；移动进入拖动，Edit 打开编辑面板（含 x 关闭）。
 *
 * 流程：点击容器 → 显示工具栏(移动/Edit) → 点移动则进入拖动(单组 document 监听) → 点 Edit 则打开面板；
 * Edit 打开时点击其它容器不响应，须先关面板。拖拽仅用一套 document 的 mousemove/mouseup/touchmove/touchend，避免每容器绑定导致监听堆积与卡顿。
 *
 * 发热点注意：document 上仅 4 个全局拖拽监听；容器只绑 click；删除容器无需移除监听；截图用 html2canvas 为异步，不阻塞。
 */
(function () {
    "use strict";

    var MAX_CONTAINERS = 10;
    var containerIdSeq = 0;
    var selectedContainerEl = null;
    var uploadObjectUrls = [];

    var draggingContainer = null;
    var dragStartX = 0, dragStartY = 0, dragStartLeft = 0, dragStartTop = 0;
    var lastClickX = 0, lastClickY = 0;
    var memoryPlusFeePaid = false;

    var stageEl, containersEl, addBtn, hideUiBtn, backBtn, uploadInput, screenshotBtn;
    var addPopoverEl, sourceLocalBtn, sourceAssetsBtn, assetsPanelEl, assetsGridEl, assetsCloseBtn;
    var containerToolbarEl, toolbarMoveBtn, toolbarEditBtn, toolbarLabelEl, editPanelEl, editPanelCloseBtn, editPanelBodyEl, editPanelTitleEl, editPanelZEl;
    var sceneMemoryEl;

    function getEl(id) {
        return document.getElementById(id);
    }

    /** 从 ALICE_CONSTANTS + 约定生成 assets 下所有 .webp 列表；若存在 assets/webp-manifest.json 则优先用 */
    function buildAssetsWebpList(cb) {
        var manifestUrl = "assets/webp-manifest.json";
        fetch(manifestUrl)
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function (arr) {
                if (Array.isArray(arr)) {
                    return arr.map(function (p) {
                        return p.indexOf("assets/") === 0 ? p : "assets/" + p;
                    });
                }
                return Promise.reject();
            })
            .then(cb)
            .catch(function () {
                var list = [];
                var chars = typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.CHARACTERS ? ALICE_CONSTANTS.CHARACTERS : {};
                var base = "assets/characters/";
                Object.keys(chars).forEach(function (id) {
                    var c = chars[id];
                    if (c.default) list.push(c.default.indexOf("assets/") === 0 ? c.default : base + c.default);
                    if (c.emotions) {
                        c.emotions.forEach(function (em) {
                            if (em === "default") return;
                            list.push(base + id + "_" + em + ".webp");
                        });
                    }
                });
                list.push("assets/characters/moichan1.webp", "assets/characters/moichan2.webp");
                list.push("assets/backgrounds/T1.webp", "assets/backgrounds/T2.webp", "assets/backgrounds/T3.webp", "assets/backgrounds/T4.webp", "assets/backgrounds/map_main.webp");
                list.push("assets/ui/card_back.webp");
                list = list.filter(function (v, i, a) { return a.indexOf(v) === i; });
                cb(list);
            });
    }

    function init() {
        sceneMemoryEl = getEl("scene-memory");
        stageEl = getEl("memory-stage");
        containersEl = getEl("memory-containers");
        containerToolbarEl = getEl("memory-container-toolbar");
        toolbarMoveBtn = getEl("memory-toolbar-move");
        toolbarEditBtn = getEl("memory-toolbar-edit");
        editPanelEl = getEl("memory-edit-panel");
        editPanelCloseBtn = getEl("memory-edit-panel-close");
        editPanelBodyEl = editPanelEl ? editPanelEl.querySelector(".memory-edit-panel-body") : null;
        editPanelTitleEl = getEl("memory-edit-panel-title");
        editPanelZEl = getEl("memory-edit-panel-z");
        toolbarLabelEl = getEl("memory-toolbar-label");
        addBtn = getEl("memory-add-container");
        hideUiBtn = getEl("memory-hide-ui");
        backBtn = getEl("memory-back-map");
        screenshotBtn = getEl("memory-screenshot");
        uploadInput = getEl("memory-upload-input");
        addPopoverEl = getEl("memory-add-popover");
        sourceLocalBtn = getEl("memory-source-local");
        sourceAssetsBtn = getEl("memory-source-assets");
        assetsPanelEl = getEl("memory-assets-panel");
        assetsGridEl = getEl("memory-assets-grid");
        assetsCloseBtn = getEl("memory-assets-close");

        if (!containersEl || !stageEl) return;

        addBtn.addEventListener("click", onAddBtnClick);
        sourceLocalBtn.addEventListener("click", onSourceLocalClick);
        sourceAssetsBtn.addEventListener("click", onSourceAssetsClick);
        assetsCloseBtn.addEventListener("click", function () { assetsPanelEl.classList.add("hidden"); });
        hideUiBtn.addEventListener("click", onHideUi);
        backBtn.addEventListener("click", onBackMap);
        if (screenshotBtn) screenshotBtn.addEventListener("click", onScreenshotClick);
        stageEl.addEventListener("click", onStageClick);
        if (editPanelBodyEl) editPanelBodyEl.addEventListener("click", onEditPanelClick);
        if (editPanelCloseBtn) editPanelCloseBtn.addEventListener("click", closeEditPanel);
        if (toolbarMoveBtn) toolbarMoveBtn.addEventListener("click", onToolbarMoveClick);
        if (toolbarEditBtn) toolbarEditBtn.addEventListener("click", onToolbarEditClick);
        uploadInput.addEventListener("change", onUploadSelected);

        document.addEventListener("click", function (e) {
            if (addPopoverEl && !addPopoverEl.contains(e.target) && e.target !== addBtn) {
                addPopoverEl.classList.add("hidden");
            }
            if (containerToolbarEl && !containerToolbarEl.contains(e.target) && !(editPanelEl && editPanelEl.contains(e.target)) && selectedContainerEl && !selectedContainerEl.contains(e.target)) {
                closeToolbar();
            }
        });

        document.addEventListener("mousemove", onDocumentPointerMove);
        document.addEventListener("touchmove", onDocumentTouchMove, { passive: false });
        document.addEventListener("mouseup", onDocumentPointerUp);
        document.addEventListener("touchend", onDocumentPointerUp);
    }

    function getPointerCoords(e) {
        if (e.clientX != null) return { x: e.clientX, y: e.clientY };
        var t = e.touches && e.touches[0];
        if (t) return { x: t.clientX, y: t.clientY };
        return { x: 0, y: 0 };
    }

    function onDocumentPointerMove(e) {
        if (!draggingContainer) return;
        var coords = getPointerCoords(e);
        draggingContainer.dataset.dragX = String(dragStartLeft + (coords.x - dragStartX));
        draggingContainer.dataset.dragY = String(dragStartTop + (coords.y - dragStartY));
        applyContainerTransform(draggingContainer);
    }

    function onDocumentTouchMove(e) {
        if (!draggingContainer) return;
        e.preventDefault();
        var coords = getPointerCoords(e);
        draggingContainer.dataset.dragX = String(dragStartLeft + (coords.x - dragStartX));
        draggingContainer.dataset.dragY = String(dragStartTop + (coords.y - dragStartY));
        applyContainerTransform(draggingContainer);
    }

    function onDocumentPointerUp() {
        if (draggingContainer) {
            draggingContainer.classList.remove("memory-container-dragging");
            draggingContainer = null;
        }
    }

    function closeToolbar() {
        if (containerToolbarEl) containerToolbarEl.classList.add("hidden");
        selectedContainerEl = null;
    }

    function closeEditPanel() {
        if (editPanelEl) editPanelEl.classList.add("hidden");
    }

    function onToolbarMoveClick(e) {
        if (!selectedContainerEl) return;
        e.stopPropagation();
        var wrap = selectedContainerEl;
        draggingContainer = wrap;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragStartLeft = parseFloat(wrap.dataset.dragX || "0");
        dragStartTop = parseFloat(wrap.dataset.dragY || "0");
        wrap.classList.add("memory-container-dragging");
        closeToolbar();
    }

    function onToolbarEditClick(e) {
        e.stopPropagation();
        if (!selectedContainerEl) return;
        if (containerToolbarEl) containerToolbarEl.classList.add("hidden");
        if (editPanelTitleEl) editPanelTitleEl.textContent = "Edit - 编号" + (selectedContainerEl.dataset.number || "?");
        updateEditPanelZ();
        if (editPanelEl) {
            editPanelEl.classList.remove("hidden");
            var panelW = editPanelEl.offsetWidth || 180;
            var panelH = editPanelEl.offsetHeight || 320;
            var offset = 12;
            var left = Math.max(8, Math.min(lastClickX + offset, window.innerWidth - panelW - 8));
            var top = Math.max(8, Math.min(lastClickY + offset, window.innerHeight - panelH - 8));
            editPanelEl.style.left = left + "px";
            editPanelEl.style.top = top + "px";
        }
    }

    function updateEditPanelZ() {
        if (editPanelZEl && selectedContainerEl) {
            editPanelZEl.textContent = "z: " + (selectedContainerEl.style.zIndex || "0");
        }
    }

    function onEditPanelClick(e) {
        var btn = e.target.closest("button[data-action]");
        if (!btn || !selectedContainerEl) return;
        runEditAction(btn.getAttribute("data-action"));
    }

    function onAddBtnClick(e) {
        e.stopPropagation();
        if (getContainerCount() >= MAX_CONTAINERS) {
            alert("最多 " + MAX_CONTAINERS + " 个容器。");
            return;
        }
        if (!memoryPlusFeePaid) {
            var cost = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.BALANCE && ALICE_CONSTANTS.BALANCE.MEMORY_ENTRY_COST) ? ALICE_CONSTANTS.BALANCE.MEMORY_ENTRY_COST : 200;
            var state = typeof Auth !== "undefined" ? Auth.getState() : null;
            var points = (state && state.points != null) ? Number(state.points) : 0;
            if (points < cost) {
                alert("因果值不足 " + cost + "，无法使用拍照场地。请至市集兑换或完成每日任务。");
                return;
            }
            var doPayAndOpen = function () {
                memoryPlusFeePaid = true;
                var s = typeof Auth !== "undefined" ? Auth.getState() : null;
                if (s) Auth.updateLocal({ points: (s.points || 0) - cost });
                if (typeof window.App !== "undefined" && window.App.updateUI) window.App.updateUI();
                if (addPopoverEl) addPopoverEl.classList.toggle("hidden");
            };
            if (typeof window.App !== "undefined" && window.App.showConfirm) {
                window.App.showConfirm("使用拍照场地将消耗 " + cost + " 因果值，是否确认？", doPayAndOpen, function () {});
            } else {
                doPayAndOpen();
            }
            return;
        }
        if (addPopoverEl) addPopoverEl.classList.toggle("hidden");
    }

    function onSourceLocalClick() {
        addPopoverEl.classList.add("hidden");
        uploadInput.value = "";
        uploadInput.setAttribute("data-add-new", "1");
        uploadInput.click();
    }

    function onSourceAssetsClick() {
        addPopoverEl.classList.add("hidden");
        assetsGridEl.innerHTML = "";
        assetsPanelEl.classList.remove("hidden");
        buildAssetsWebpList(function (list) {
            list.forEach(function (src) {
                var cell = document.createElement("div");
                cell.className = "memory-asset-item";
                var img = document.createElement("img");
                img.src = src;
                img.alt = src.split("/").pop();
                img.loading = "lazy";
                img.onerror = function () { cell.style.display = "none"; };
                img.onclick = function () {
                    addContainer(src);
                    assetsPanelEl.classList.add("hidden");
                };
                cell.appendChild(img);
                assetsGridEl.appendChild(cell);
            });
        });
    }

    function onStageClick(e) {
        if (sceneMemoryEl && sceneMemoryEl.classList.contains("memory-ui-hidden")) {
            sceneMemoryEl.classList.remove("memory-ui-hidden");
        }
        if (e.target === stageEl || e.target === containersEl) {
            closeContextMenu();
        }
    }

    function onHideUi() {
        if (sceneMemoryEl) sceneMemoryEl.classList.add("memory-ui-hidden");
        closeContextMenu();
        if (addPopoverEl) addPopoverEl.classList.add("hidden");
        if (assetsPanelEl) assetsPanelEl.classList.add("hidden");
    }

    function clearAllContainers() {
        if (!containersEl) return;
        var list = containersEl.querySelectorAll(".memory-container img[src^='blob:']");
        for (var i = 0; i < list.length; i++) {
            try { URL.revokeObjectURL(list[i].src); } catch (e) {}
        }
        uploadObjectUrls.forEach(function (url) {
            try { URL.revokeObjectURL(url); } catch (e) {}
        });
        uploadObjectUrls.length = 0;
        containersEl.innerHTML = "";
        memoryPlusFeePaid = false;
        closeContextMenu();
        if (addPopoverEl) addPopoverEl.classList.add("hidden");
        if (assetsPanelEl) assetsPanelEl.classList.add("hidden");
    }

    function onBackMap() {
        memoryPlusFeePaid = false;
        clearAllContainers();
        if (typeof window.App !== "undefined" && window.App.showScene && typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.SCENES) {
            window.App.showScene(ALICE_CONSTANTS.SCENES.MAP);
        }
    }

    function onScreenshotClick() {
        if (typeof html2canvas === "undefined") {
            alert("截图功能加载中，请稍后再试。");
            return;
        }
        html2canvas(stageEl, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scale: window.devicePixelRatio || 1
        }).then(function (canvas) {
            var data = canvas.toDataURL("image/png");
            var a = document.createElement("a");
            a.download = "memory-screenshot-" + (Date.now()) + ".png";
            a.href = data;
            a.click();
        }).catch(function (err) {
            alert("截图失败：" + (err && err.message ? err.message : "未知错误"));
        });
    }

    function closeContextMenu() {
        closeToolbar();
        closeEditPanel();
    }

    function getContainerCount() {
        return containersEl ? containersEl.querySelectorAll(".memory-container").length : 0;
    }

    function addContainer(src, options) {
        options = options || {};
        var id = "mem-c-" + (++containerIdSeq);
        var count = getContainerCount();
        var left = 15 + (count % 4) * 8;
        var top = 20 + Math.floor(count / 4) * 12;

        var num = containerIdSeq;
        var wrap = document.createElement("div");
        wrap.className = "memory-container";
        wrap.dataset.id = id;
        wrap.dataset.number = String(num);
        wrap.style.left = (options.left != null ? options.left : left) + "%";
        wrap.style.top = (options.top != null ? options.top : top) + "%";
        wrap.dataset.dragX = "0";
        wrap.dataset.dragY = "0";
        wrap.dataset.scale = options.scale != null ? String(options.scale) : "1";
        applyContainerTransform(wrap);
        wrap.style.zIndex = String(options.zIndex != null ? options.zIndex : count);
        if (options.widthPct) wrap.style.width = options.widthPct + "%";
        if (options.crop) wrap.style.clipPath = options.crop;

        var img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.dataset.rotate = String(options.rotate || 0);
        img.dataset.scaleX = String(options.scaleX != null ? options.scaleX : 1);
        img.dataset.scaleY = String(options.scaleY != null ? options.scaleY : 1);

        img.onload = function () {
            var nw = img.naturalWidth;
            var nh = img.naturalHeight;
            if (nw && nh && !wrap.style.aspectRatio) {
                wrap.style.aspectRatio = nw + " / " + nh;
                if (!options.widthPct) wrap.style.width = "min(280px, 40vw)";
            }
        };

        wrap.appendChild(img);
        setupContainerInteraction(wrap);
        containersEl.appendChild(wrap);
    }

    function applyContainerTransform(wrap) {
        var dx = parseFloat(wrap.dataset.dragX || "0");
        var dy = parseFloat(wrap.dataset.dragY || "0");
        var scale = parseFloat(wrap.dataset.scale || "1");
        wrap.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
    }

    function setupContainerInteraction(wrap) {
        wrap.addEventListener("click", function (e) {
            e.stopPropagation();
            if (editPanelEl && !editPanelEl.classList.contains("hidden")) return;
            if (draggingContainer) return;
            var cx = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            var cy = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            lastClickX = cx;
            lastClickY = cy;
            selectedContainerEl = wrap;
            if (toolbarLabelEl) toolbarLabelEl.textContent = "编号" + (wrap.dataset.number || "?");
            if (containerToolbarEl) {
                containerToolbarEl.classList.remove("hidden");
                var tw = containerToolbarEl.offsetWidth || 120;
                var th = containerToolbarEl.offsetHeight || 40;
                var offset = 12;
                var left = Math.max(8, Math.min(cx + offset, window.innerWidth - tw - 8));
                var top = Math.max(8, Math.min(cy + offset, window.innerHeight - th - 8));
                containerToolbarEl.style.left = left + "px";
                containerToolbarEl.style.top = top + "px";
            }
        });
    }

    function runEditAction(action) {
        if (!selectedContainerEl) return;
        var img = selectedContainerEl.querySelector("img");
        var wrap = selectedContainerEl;

        switch (action) {
            case "rotate90": {
                var r = (parseInt(img.dataset.rotate || "0", 10) + 90) % 360;
                img.dataset.rotate = String(r);
                updateImgTransform(img);
                break;
            }
            case "flipV": {
                var sy = (parseFloat(img.dataset.scaleY || "1") * -1);
                img.dataset.scaleY = String(sy);
                updateImgTransform(img);
                break;
            }
            case "flipH": {
                var sx = (parseFloat(img.dataset.scaleX || "1") * -1);
                img.dataset.scaleX = String(sx);
                updateImgTransform(img);
                break;
            }
            case "front": {
                var z = parseInt(wrap.style.zIndex || "0", 10) + 1;
                z = Math.min(10, z);
                wrap.style.zIndex = String(z);
                updateEditPanelZ();
                break;
            }
            case "back": {
                var z = parseInt(wrap.style.zIndex || "0", 10) - 1;
                z = Math.max(0, z);
                wrap.style.zIndex = String(z);
                updateEditPanelZ();
                break;
            }
            case "crop": {
                var crop = wrap.style.clipPath || "none";
                if (crop === "none" || crop === "") wrap.style.clipPath = "inset(10% round 8px)";
                else if (crop.indexOf("inset") !== -1) wrap.style.clipPath = "circle(40%)";
                else wrap.style.clipPath = "none";
                break;
            }
            case "resize": {
                var pct = prompt("缩放 %（10～600，例如 50 表示 50%）", (wrap.dataset.scale ? parseFloat(wrap.dataset.scale) * 100 : 100) + "");
                if (pct === null) break;
                var num = parseFloat(pct);
                if (!isNaN(num) && num > 0) {
                    var scale = Math.min(6, Math.max(0.1, num / 100));
                    wrap.dataset.scale = String(scale);
                    applyContainerTransform(wrap);
                }
                break;
            }
            case "delete": {
                if (img.src && img.src.indexOf("blob:") === 0) {
                    URL.revokeObjectURL(img.src);
                }
                wrap.remove();
                selectedContainerEl = null;
                closeEditPanel();
                break;
            }
        }
    }

    function updateImgTransform(img) {
        var r = parseInt(img.dataset.rotate || "0", 10);
        var sx = parseFloat(img.dataset.scaleX || "1");
        var sy = parseFloat(img.dataset.scaleY || "1");
        img.style.transform = "rotate(" + r + "deg) scaleX(" + sx + ") scaleY(" + sy + ")";
    }

    function onUploadSelected(e) {
        var file = e.target && e.target.files && e.target.files[0];
        if (!file) return;
        var url = URL.createObjectURL(file);
        uploadObjectUrls.push(url);
        var addNew = e.target.getAttribute("data-add-new") === "1";
        e.target.removeAttribute("data-add-new");
        if (addNew) {
            addContainer(url);
        }
        closeContextMenu();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
