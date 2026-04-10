/**
 * 地图主页：「爱丽丝庭院」「TCG」两个入口，点击展开子菜单。
 */
(function () {
    "use strict";

    var root, titleEl, bodyAlice, bodyTcg;

    function close() {
        if (!root) return;
        root.classList.add("hidden");
        root.setAttribute("aria-hidden", "true");
    }

    function open(which) {
        if (!root || !titleEl || !bodyAlice || !bodyTcg) return;
        titleEl.textContent = which === "alice" ? "爱丽丝庭院" : "TCG";
        bodyAlice.classList.toggle("hidden", which !== "alice");
        bodyTcg.classList.toggle("hidden", which !== "tcg");
        root.classList.remove("hidden");
        root.setAttribute("aria-hidden", "false");
    }

    function goScene(key) {
        close();
        if (typeof App !== "undefined" && App.navigateTo) App.navigateTo(key);
    }

    function openNews() {
        close();
        window.open("news.html", "_blank", "noopener,noreferrer");
    }

    function openSocial() {
        close();
        window.open("social.html", "_blank", "noopener,noreferrer");
    }

    function goAnother() {
        close();
        window.location.href = "another.html";
    }

    function openIndividualShop() {
        close();
        window.location.href = "individualshop.html";
    }

    function openShowcase() {
        close();
        window.location.href = "showcase.html";
    }

    function openChat() {
        close();
        window.location.href = "chat.html";
    }

    function init() {
        root = document.getElementById("map-hub-root");
        titleEl = document.getElementById("map-hub-title");
        bodyAlice = document.getElementById("map-hub-body-alice");
        bodyTcg = document.getElementById("map-hub-body-tcg");
        if (!root) return;
        var bd = document.getElementById("map-hub-backdrop");
        var cls = root.querySelector(".map-hub-close");
        if (bd) bd.addEventListener("click", close);
        if (cls) cls.addEventListener("click", close);
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && root && !root.classList.contains("hidden")) close();
        });
    }

    window.MapHub = {
        open: open,
        close: close,
        goScene: goScene,
        openNews: openNews,
        openSocial: openSocial,
        goAnother: goAnother,
        openIndividualShop: openIndividualShop,
        openShowcase: openShowcase,
        openChat: openChat,
        init: init
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
