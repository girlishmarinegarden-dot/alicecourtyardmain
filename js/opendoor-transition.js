/**
 * 🗝️ Alice Courtyard 开门过渡模块
 * 1. 动画钥匙：下落→弹跳→90° 旋转，结束后隐藏
 * 2. idle 钥匙：独立出现，无旋转，普通拖动（与鼠标同向），接触锁孔触发视频
 */
(function () {
    "use strict";

    var overlay = null;
    var videoEl = null;
    var keyholeEl = null;
    var keyAnimEl = null;
    var keyIdleEl = null;
    var triggered = false;
    var isDragging = false;
    var dragX = 0, dragY = 0;
    var startX = 0, startY = 0, startDragX = 0, startDragY = 0;
    var onDone = null;

    /** idle 钥匙与锁孔是否接触 */
    function keyTouchesKeyhole() {
        if (!keyIdleEl || !keyholeEl) return false;
        var kr = keyIdleEl.getBoundingClientRect();
        var hr = keyholeEl.getBoundingClientRect();
        return !(kr.right < hr.left || kr.left > hr.right || kr.bottom < hr.top || kr.top > hr.bottom);
    }

    function checkTrigger() {
        if (triggered) return;
        if (keyTouchesKeyhole()) {
            triggered = true;
            isDragging = false;
            keyIdleEl.classList.add("hidden");
            keyIdleEl.style.pointerEvents = "none";
            if (keyholeEl) keyholeEl.classList.add("hidden");
            videoEl.classList.add("playing");
            videoEl.play().catch(function () {});
        }
    }

    /** 屏幕位移转 90° 旋转后的局部位移：钥匙横躺时拖动仍与鼠标同向 */
    function applyIdleTransform() {
        if (!keyIdleEl) return;
        var localX = dragY;
        var localY = -dragX;
        keyIdleEl.style.transform = "translate(-50%, -50%) rotate(90deg) translate(" + localX + "px, " + localY + "px)";
    }

    function onIdlePointerDown(e) {
        if (triggered) return;
        e.preventDefault();
        isDragging = true;
        var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        startX = x;
        startY = y;
        startDragX = dragX;
        startDragY = dragY;
    }

    function onIdlePointerMove(e) {
        if (triggered || !isDragging) return;
        var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        dragX = startDragX + (x - startX);
        dragY = startDragY + (y - startY);
        applyIdleTransform();
        checkTrigger();
    }

    function onIdlePointerUp() {
        if (triggered) return;
        isDragging = false;
        checkTrigger();
    }

    function bindIdleDrag() {
        if (!keyIdleEl) return;
        keyIdleEl.addEventListener("pointerdown", onIdlePointerDown, { passive: false });
        window.addEventListener("pointermove", onIdlePointerMove, { passive: false });
        window.addEventListener("pointerup", onIdlePointerUp, { passive: true });
        window.addEventListener("pointerleave", onIdlePointerUp, { passive: true });
        keyIdleEl.addEventListener("touchstart", onIdlePointerDown, { passive: false });
        window.addEventListener("touchmove", onIdlePointerMove, { passive: false });
        window.addEventListener("touchend", onIdlePointerUp, { passive: true });
    }

    function unbindIdleDrag() {
        if (!keyIdleEl) return;
        keyIdleEl.removeEventListener("pointerdown", onIdlePointerDown);
        window.removeEventListener("pointermove", onIdlePointerMove);
        window.removeEventListener("pointerup", onIdlePointerUp);
        window.removeEventListener("pointerleave", onIdlePointerUp);
        keyIdleEl.removeEventListener("touchstart", onIdlePointerDown);
        window.removeEventListener("touchmove", onIdlePointerMove);
        window.removeEventListener("touchend", onIdlePointerUp);
    }

    function onKeyAnimationEnd() {
        if (!keyAnimEl || !keyIdleEl) return;
        keyAnimEl.classList.add("hidden");
        keyIdleEl.classList.remove("hidden");
        keyIdleEl.style.pointerEvents = "auto";
        dragX = 0;
        dragY = 0;
        applyIdleTransform();
        bindIdleDrag();
    }

    function onVideoEnded() {
        videoEl.classList.remove("playing", "visible");
        videoEl.pause();
        videoEl.src = "";
        overlay.classList.add("hidden");
        overlay.setAttribute("aria-hidden", "true");
        unbindIdleDrag();
        if (typeof onDone === "function") onDone();
        onDone = null;
    }

    function run(callback) {
        overlay = document.getElementById("opendoor-overlay");
        videoEl = document.getElementById("opendoor-video");
        keyholeEl = document.getElementById("opendoor-keyhole");
        keyAnimEl = document.getElementById("opendoor-key");
        keyIdleEl = document.getElementById("opendoor-key-idle");
        if (!overlay || !videoEl || !keyAnimEl || !keyIdleEl) {
            if (typeof callback === "function") callback();
            return;
        }
        triggered = false;
        isDragging = false;
        dragX = 0;
        dragY = 0;
        onDone = callback;

        var keySrc = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.OPENDOOR_KEY) ? ALICE_CONSTANTS.PATHS.OPENDOOR_KEY : "assets/ui/key.webp";
        var videoSrc = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.OPENDOOR_VIDEO) ? ALICE_CONSTANTS.PATHS.OPENDOOR_VIDEO : "assets/videos/opendoor.webm";
        var keyholeSrc = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.OPENDOOR_KEYHOLE) ? ALICE_CONSTANTS.PATHS.OPENDOOR_KEYHOLE : "assets/ui/keyhole.webp";

        videoEl.classList.remove("playing");
        videoEl.pause();
        videoEl.src = videoSrc;
        videoEl.classList.add("visible");

        keyAnimEl.src = keySrc;
        keyAnimEl.classList.remove("hidden", "animating");
        keyAnimEl.style.transform = "";
        keyIdleEl.src = keySrc;
        keyIdleEl.classList.add("hidden");

        if (keyholeEl) keyholeEl.src = keyholeSrc;

        document.querySelectorAll(".scene").forEach(function (s) { s.classList.remove("active"); });
        overlay.classList.remove("hidden");
        overlay.setAttribute("aria-hidden", "false");

        function startKeyFall() {
            keyAnimEl.classList.add("animating");
        }
        if (requestAnimationFrame) {
            requestAnimationFrame(function () { requestAnimationFrame(startKeyFall); });
        } else {
            setTimeout(startKeyFall, 50);
        }

        keyAnimEl.addEventListener("animationend", function once() {
            keyAnimEl.removeEventListener("animationend", once);
            onKeyAnimationEnd();
        });
        videoEl.addEventListener("ended", onVideoEnded, { once: true });
    }

    window.OpenDoorTransition = { run: run };
})();
