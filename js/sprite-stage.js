/**
 * 立绘区域（yume/hana/mizuki/azalea/sienna 等）：可拖动移开，点击「隐藏」可隐藏立绘
 */
(function () {
    "use strict";

    var STORAGE_POS = "AliceGarden_StageArea";
    var STORAGE_HIDDEN = "AliceGarden_StageHidden";
    var CLICK_THRESHOLD = 6;

    var stageEl, hideBtn, spriteEl, glowEl;
    var drag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var ticking = false;

    function loadPosition() {
        if (!stageEl) return;
        try {
            var raw = localStorage.getItem(STORAGE_POS);
            if (raw) {
                var o = JSON.parse(raw);
                if (o && typeof o.left === "number" && typeof o.top === "number") {
                    stageEl.style.left = o.left + "px";
                    stageEl.style.top = o.top + "px";
                    stageEl.style.right = "auto";
                    stageEl.style.bottom = "auto";
                    return;
                }
            }
        } catch (e) {}
        stageEl.style.left = "";
        stageEl.style.top = "";
        stageEl.style.right = "0";
        stageEl.style.bottom = "0";
    }

    function savePosition() {
        if (!stageEl) return;
        var rect = stageEl.getBoundingClientRect();
        try {
            localStorage.setItem(STORAGE_POS, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
        } catch (e) {}
    }

    function isHidden() {
        try {
            return localStorage.getItem(STORAGE_HIDDEN) === "true";
        } catch (e) {
            return false;
        }
    }

    function setHidden(hide) {
        try {
            localStorage.setItem(STORAGE_HIDDEN, hide ? "true" : "false");
        } catch (e) {}
    }

    function applyHidden() {
        var hide = isHidden();
        if (stageEl) stageEl.classList.toggle("stage-area-hidden", hide);
        if (hideBtn) {
            hideBtn.textContent = hide ? "显示" : "隐藏";
            hideBtn.setAttribute("aria-label", hide ? "显示立绘" : "隐藏立绘");
        }
    }

    function isInsideHideBtn(target) {
        return hideBtn && (target === hideBtn || hideBtn.contains(target));
    }

    function onPointerDown(e) {
        if (isInsideHideBtn(e.target)) return;
        /* 不在此处 preventDefault，否则手机端不会触发 click，立绘点击无法显示好感度 */
        var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        var rect = stageEl.getBoundingClientRect();
        drag = { active: true, startX: x, startY: y, startLeft: rect.left, startTop: rect.top };
    }

    function onPointerMove(e) {
        if (!drag.active) return;
        e.preventDefault();
        if (ticking) return;
        ticking = true;
        var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        var dx = x - drag.startX;
        var dy = y - drag.startY;
        var newLeft = drag.startLeft + dx;
        var newTop = drag.startTop + dy;
        requestAnimationFrame(function () {
            if (!drag.active || !stageEl) { ticking = false; return; }
            stageEl.style.left = Math.max(0, Math.min(window.innerWidth - stageEl.offsetWidth, newLeft)) + "px";
            stageEl.style.top = Math.max(0, Math.min(window.innerHeight - stageEl.offsetHeight, newTop)) + "px";
            stageEl.style.right = "auto";
            stageEl.style.bottom = "auto";
            ticking = false;
        });
    }

    function onPointerUp(e) {
        if (!drag.active) return;
        drag.active = false;
        savePosition();
    }

    function onHideBtnClick(e) {
        e.preventDefault();
        e.stopPropagation();
        var next = !isHidden();
        if (spriteEl && typeof CharacterFavor !== "undefined") {
            var charId = spriteEl.dataset.charId;
            if (charId) {
                if (next) CharacterFavor.addFavor(charId, -2);
                else CharacterFavor.addFavor(charId, 1);
                CharacterFavor.showCharacter(spriteEl, charId);
            }
        }
        setHidden(next);
        applyHidden();
    }

    function init() {
        stageEl = document.getElementById("stage-area");
        hideBtn = document.getElementById("stage-area-hide-btn");
        spriteEl = document.getElementById("main-character-sprite");
        glowEl = document.getElementById("character-glow");
        if (!stageEl) return;

        loadPosition();
        applyHidden();

        stageEl.addEventListener("mousedown", onPointerDown);
        stageEl.addEventListener("touchstart", onPointerDown, { passive: false });
        document.addEventListener("mousemove", onPointerMove);
        document.addEventListener("touchmove", onPointerMove, { passive: false });
        document.addEventListener("mouseup", onPointerUp);
        document.addEventListener("touchend", onPointerUp);

        if (hideBtn) hideBtn.addEventListener("click", onHideBtnClick);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
