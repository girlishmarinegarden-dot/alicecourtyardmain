/**
 * 安装门控：未安装时仅显示安装页，不显示登入；安装后或以 App 打开时不再显示安装页。
 * 支持安装前选择语言（中文 / English / Bahasa Melayu），使用 Google Translate 自动翻译。
 * iOS 显示「添加到主屏幕」教程。无离线缓存。
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

    function getInstalledKey() {
        return (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.INSTALLED)
            ? ALICE_CONSTANTS.STORAGE.INSTALLED
            : "AliceGarden_Installed";
    }

    function getLangKey() {
        return (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.LANG)
            ? ALICE_CONSTANTS.STORAGE.LANG
            : LANG_KEY;
    }

    function isMarkedInstalled() {
        try {
            return localStorage.getItem(getInstalledKey()) === "true";
        } catch (e) {
            return false;
        }
    }

    function markInstalled() {
        try {
            localStorage.setItem(getInstalledKey(), "true");
        } catch (e) {}
    }

    function shouldShowInstallPage() {
        if (isStandalone()) return false;
        if (isMarkedInstalled()) return false;
        return true;
    }

    function showApp() {
        var installPage = document.getElementById("install-page");
        var appShell = document.getElementById("app-shell");
        if (installPage) installPage.classList.add("hidden");
        if (appShell) appShell.classList.remove("hidden");
        if (typeof App !== "undefined" && App.init) App.init();
    }

    function showInstall() {
        var installPage = document.getElementById("install-page");
        var appShell = document.getElementById("app-shell");
        if (installPage) installPage.classList.remove("hidden");
        if (appShell) appShell.classList.add("hidden");
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

    function setup() {
        showInstall();

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
            markInstalled();
            showApp();
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
                    deferredPrompt.userChoice.then(function (result) {
                        if (result.outcome === "accepted") markInstalled();
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
                markInstalled();
                showApp();
            });
        }
    }

    function run() {
        if (shouldShowInstallPage()) {
            setup();
        } else {
            if (isStandalone()) markInstalled();
            showApp();
        }
    }

    return {
        shouldShowInstallPage: shouldShowInstallPage,
        run: run,
        isStandalone: isStandalone,
        isIOS: isIOS
    };
})();
