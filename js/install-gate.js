/**
 * PWA 安装：install.html 引导；index.html 横幅仅看是否以「已安装模式」打开。
 * 不读写 localStorage 安装标记：卸载 App 后仍留在浏览器里的 true 会导致横幅永久消失。
 */
var InstallGate = (function () {
    "use strict";

    var LANG_KEY = "AliceGarden_Lang";

    function isStandalone() {
        if (typeof window === "undefined" || !window.matchMedia) return false;
        if (window.matchMedia("(display-mode: standalone)").matches) return true;
        if (window.navigator && window.navigator.standalone === true) return true;
        if (document.referrer && document.referrer.indexOf("android-app://") === 0) return true;
        return false;
    }

    function isIOS() {
        if (typeof navigator === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    function getLangKey() {
        return (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.LANG)
            ? ALICE_CONSTANTS.STORAGE.LANG
            : LANG_KEY;
    }

    /** 仅在普通浏览器标签中显示安装引导；从主屏幕/PWA 窗口打开则隐藏 */
    function shouldShowInstallPage() {
        return !isStandalone();
    }

    function redirectToIndex() {
        try {
            window.location.replace("index.html");
        } catch (e) {
            window.location.href = "index.html";
        }
    }

    function applyLanguage(lang) {
        try {
            localStorage.setItem(getLangKey(), lang);
            if (lang === "zh-CN") {
                document.cookie = "googtrans=; path=/; max-age=0";
            } else {
                document.cookie = "googtrans=/zh-CN/" + lang + "; path=/";
            }
            window.location.reload();
        } catch (e) {}
    }

    var deferredPrompt = null;

    function setupInstallWizard() {
        if (isIOS()) {
            var iosTutorial = document.getElementById("install-ios-tutorial");
            var doneBtn = document.getElementById("install-done-btn");
            if (iosTutorial) iosTutorial.classList.remove("hidden");
            if (doneBtn) doneBtn.classList.remove("hidden");
            var installBtn = document.getElementById("install-app-btn");
            if (installBtn) installBtn.classList.add("hidden");
        }

        window.addEventListener("beforeinstallprompt", function (e) {
            e.preventDefault();
            deferredPrompt = e;
        });

        window.addEventListener("appinstalled", function () {
            deferredPrompt = null;
            redirectToIndex();
        });

        document.querySelectorAll(".install-lang-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var lang = btn.getAttribute("data-lang");
                if (lang) applyLanguage(lang);
            });
        });

        var installBtn = document.getElementById("install-app-btn");
        if (installBtn) {
            installBtn.addEventListener("click", function () {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(function () {
                        deferredPrompt = null;
                    });
                } else if (!isIOS()) {
                    var iosHint = document.getElementById("install-ios-hint");
                    var doneBtn = document.getElementById("install-done-btn");
                    if (iosHint) iosHint.classList.remove("hidden");
                    if (doneBtn) doneBtn.classList.remove("hidden");
                }
            });
        }

        var doneBtn = document.getElementById("install-done-btn");
        if (doneBtn) {
            doneBtn.addEventListener("click", function () {
                redirectToIndex();
            });
        }
    }

    /** install.html：已以 PWA/主屏幕打开则回首页；否则挂载安装 UI */
    function runInstallWizard() {
        if (!shouldShowInstallPage()) {
            redirectToIndex();
            return;
        }
        setupInstallWizard();
    }

    function setInstallEntryVisible(show) {
        document.querySelectorAll(".alice-pwa-install-link").forEach(function (el) {
            if (show) el.classList.remove("hidden");
            else el.classList.add("hidden");
        });
    }

    /** index.html：横幅显隐仅看是否 standalone；本页触发 appinstalled 时当前会话先隐藏 */
    function bootstrapIndex() {
        setInstallEntryVisible(shouldShowInstallPage());
        if (!window._aliceAppInstalledBound) {
            window._aliceAppInstalledBound = true;
            window.addEventListener("appinstalled", function () {
                setInstallEntryVisible(false);
            });
        }
    }

    return {
        shouldShowInstallPage: shouldShowInstallPage,
        runInstallWizard: runInstallWizard,
        bootstrapIndex: bootstrapIndex,
        isStandalone: isStandalone,
        isIOS: isIOS
    };
})();
