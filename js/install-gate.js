/**
 * PWA 安装：install.html 上完整引导；index.html 仅显示右上角「安装」入口（未安装时）。
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
            markInstalled();
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
                redirectToIndex();
            });
        }
    }

    /** install.html：已安装则立刻回首页；否则挂载安装 UI */
    function runInstallWizard() {
        if (!shouldShowInstallPage()) {
            if (isStandalone()) markInstalled();
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
        try {
            if (show) document.body.classList.add("pwa-banner-visible");
            else document.body.classList.remove("pwa-banner-visible");
        } catch (e) {}
    }

    /** index.html：所有 .alice-pwa-install-link（右上角 + 登录页等）同步显隐，不阻塞 App.init */
    function bootstrapIndex() {
        if (isStandalone()) markInstalled();
        setInstallEntryVisible(shouldShowInstallPage());
        if (!window._aliceAppInstalledBound) {
            window._aliceAppInstalledBound = true;
            window.addEventListener("appinstalled", function () {
                markInstalled();
                setInstallEntryVisible(false);
            });
        }
    }

    return {
        shouldShowInstallPage: shouldShowInstallPage,
        runInstallWizard: runInstallWizard,
        bootstrapIndex: bootstrapIndex,
        isStandalone: isStandalone,
        isIOS: isIOS,
        markInstalled: markInstalled
    };
})();
