/**
 * moichan 浮游导航：可拖动，点击切换开眼/闭眼并弹出「去哪里？」气泡
 * 图片：moichan1.webp 开眼，moichan2.webp 闭眼；300px；不包含歌剧
 */
(function () {
    "use strict";

    var STORAGE_KEY = "AliceGarden_MoichanNav";
    var IMG_OPEN = "assets/characters/moichan1.webp";
    var IMG_CLOSED = "assets/characters/moichan2.webp";
    var CLICK_THRESHOLD = 6;
    /** 打开气泡后一段时间内不把“再点一次”当作关闭/切换，避免移动端误触导致气泡秒关 */
    var BUBBLE_OPEN_GUARD_MS = 320;

    var navEl, imgEl, bubbleEl;
    var isOpenEyes = true;
    var drag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var ticking = false;
    var bubbleOpenedAt = 0;
    var lastOptionTouchAt = 0;

    function loadPosition() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var o = JSON.parse(raw);
                if (o && typeof o.left === "number" && typeof o.top === "number") {
                    navEl.style.left = o.left + "px";
                    navEl.style.top = o.top + "px";
                    navEl.style.bottom = "auto";
                    return;
                }
            }
        } catch (e) {}
        navEl.style.left = "1rem";
        navEl.style.top = "auto";
        navEl.style.bottom = "1rem";
    }

    function savePosition() {
        var rect = navEl.getBoundingClientRect();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })); } catch (e) {}
    }

    function toggleEyes() {
        isOpenEyes = !isOpenEyes;
        if (imgEl) imgEl.src = isOpenEyes ? IMG_OPEN : IMG_CLOSED;
    }

    function openBubble() {
        if (bubbleEl) {
            bubbleEl.classList.remove("hidden");
            bubbleOpenedAt = Date.now();
        }
    }

    function closeBubble() {
        if (bubbleEl) bubbleEl.classList.add("hidden");
    }

    /** 登出或 Guest 时隐藏，已登录且非 Guest 时显示 */
    function updateVisibility() {
        if (!navEl) return;
        var state = typeof Auth !== "undefined" ? Auth.getState() : null;
        var role = state && state.role ? state.role : (typeof ALICE_CONSTANTS !== "undefined" ? ALICE_CONSTANTS.ROLES.GUEST : "GUEST");
        var isGuest = !state || !state.uid || role === "GUEST";
        if (isGuest) {
            navEl.classList.add("moichan-nav-hidden");
        } else {
            navEl.classList.remove("moichan-nav-hidden");
        }
    }

    function isInsideBubble(target) {
        return bubbleEl && (target === bubbleEl || bubbleEl.contains(target));
    }

    function findOptEl(el) {
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains("moichan-nav-opt")) return el;
            el = el.parentNode;
        }
        return null;
    }

    function onPointerDown(e) {
        if (isInsideBubble(e.target)) return;
        e.preventDefault();
        var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        var rect = navEl.getBoundingClientRect();
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
            if (!drag.active || !navEl) { ticking = false; return; }
            navEl.style.left = Math.max(0, Math.min(window.innerWidth - navEl.offsetWidth, newLeft)) + "px";
            navEl.style.top = Math.max(0, Math.min(window.innerHeight - navEl.offsetHeight, newTop)) + "px";
            navEl.style.bottom = "auto";
            ticking = false;
        });
    }

    function onPointerUp(e) {
        if (!drag.active) return;
        var x = e.clientX != null ? e.clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : drag.startX);
        var y = e.clientY != null ? e.clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : drag.startY);
        var moved = Math.abs(x - drag.startX) + Math.abs(y - drag.startY);
        drag.active = false;
        savePosition();
        if (moved <= CLICK_THRESHOLD && !isInsideBubble(e.target)) {
            if (bubbleEl && !bubbleEl.classList.contains("hidden") && (Date.now() - bubbleOpenedAt) < BUBBLE_OPEN_GUARD_MS) return;
            toggleEyes();
            openBubble();
        }
    }

    function runOptionAction(btn) {
        var go = btn && btn.getAttribute("data-go");
        closeBubble();
        if (go && typeof App !== "undefined" && App.navigateTo) App.navigateTo(go);
    }

    function onOptionClick(e) {
        if ((Date.now() - lastOptionTouchAt) < 400) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        var btn = findOptEl(e.target) || e.target;
        runOptionAction(btn);
    }

    function onOptionTouchEnd(e) {
        var btn = findOptEl(e.target);
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        lastOptionTouchAt = Date.now();
        runOptionAction(btn);
    }

    function init() {
        navEl = document.getElementById("moichan-nav");
        imgEl = document.getElementById("moichan-nav-img");
        bubbleEl = document.getElementById("moichan-nav-bubble");
        if (!navEl) return;

        loadPosition();
        if (imgEl) imgEl.src = isOpenEyes ? IMG_OPEN : IMG_CLOSED;

        navEl.addEventListener("mousedown", onPointerDown);
        navEl.addEventListener("touchstart", onPointerDown, { passive: false });
        document.addEventListener("mousemove", onPointerMove);
        document.addEventListener("touchmove", onPointerMove, { passive: false });
        document.addEventListener("mouseup", onPointerUp);
        document.addEventListener("touchend", onPointerUp);

        if (bubbleEl) {
            bubbleEl.querySelectorAll(".moichan-nav-opt").forEach(function (btn) {
                btn.addEventListener("click", onOptionClick);
                btn.addEventListener("touchend", onOptionTouchEnd, { passive: false });
            });
        }
        updateVisibility();
    }

    if (typeof window !== "undefined") window.MoichanNav = { updateVisibility: updateVisibility };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
