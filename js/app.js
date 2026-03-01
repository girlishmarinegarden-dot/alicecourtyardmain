/**
 * 主流程：code2.gs(GAS_URL)=登录/签到/fetch_core；code.gs(WALL_URL)=留言墙 wall_fetch/wall_post
 */
const App = {
    worldData: null,

    showLoading(text) {
        var isHana = (text || "").indexOf("Hana 前往中") !== -1;
        var hanaEl = document.getElementById("hana-loading-overlay");
        var hanaVideo = document.getElementById("hana-loading-video");
        var el = document.getElementById("loading-overlay");
        var txt = document.getElementById("loading-text");
        if (isHana && hanaEl && hanaVideo) {
            if (el) el.classList.add("hidden");
            hanaEl.classList.remove("hidden");
            hanaEl.setAttribute("aria-hidden", "false");
            hanaVideo.src = (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.HANA_LOADING_VIDEO) || "assets/videos/hanaloading.webm";
            hanaVideo.play().catch(function() {});
        } else {
            if (hanaEl) hanaEl.classList.add("hidden");
            if (hanaEl) hanaEl.setAttribute("aria-hidden", "true");
            if (hanaVideo) hanaVideo.pause();
            if (txt) txt.textContent = text || "请稍候…";
            if (el) el.classList.remove("hidden");
        }
    },

    hideLoading() {
        var el = document.getElementById("loading-overlay");
        var hanaEl = document.getElementById("hana-loading-overlay");
        var hanaVideo = document.getElementById("hana-loading-video");
        if (el) el.classList.add("hidden");
        if (hanaEl) hanaEl.classList.add("hidden");
        if (hanaEl) hanaEl.setAttribute("aria-hidden", "true");
        if (hanaVideo) hanaVideo.pause();
    },

    /** 主题风格确认框（无动画低功耗），确认执行 onConfirm，取消执行 onCancel */
    showConfirm(message, onConfirm, onCancel) {
        var overlay = document.getElementById("confirm-overlay");
        var msgEl = document.getElementById("confirm-message");
        var okBtn = document.getElementById("confirm-ok");
        var cancelBtn = document.getElementById("confirm-cancel");
        if (!overlay || !msgEl) return;
        msgEl.textContent = message || "";
        overlay.classList.remove("hidden");
        overlay.setAttribute("aria-hidden", "false");
        var close = function () {
            overlay.classList.add("hidden");
            overlay.setAttribute("aria-hidden", "true");
        };
        okBtn.onclick = function () {
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            close();
            if (typeof onConfirm === "function") onConfirm();
        };
        cancelBtn.onclick = function () {
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            close();
            if (typeof onCancel === "function") onCancel();
        };
    },

    /** 按场景切换主页立绘（assets/characters 下对应角色 .webp 状态机） */
    setMainSpriteChar(charId) {
        var mainSprite = document.getElementById("main-character-sprite");
        if (mainSprite && typeof CharacterFavor !== "undefined") CharacterFavor.showCharacter(mainSprite, charId);
    },

    showScene(id) {
        var self = this;
        var prevActive = document.querySelector(".scene.active");
        var prevId = prevActive ? prevActive.id : null;
        var doSwitch = function () {
            document.querySelectorAll(".scene").forEach(function (s) { s.classList.remove("active"); });
            var target = document.getElementById(id);
            if (target) target.classList.add("active");
            document.body.classList.toggle("memory-active", id === "scene-memory");
            document.body.classList.toggle("alice-ending-active", id === "scene-alice-ending");
            if (id === "scene-theater" && BGM.audio) BGM.audio.pause();
            if (prevId === "scene-theater" && id !== "scene-theater" && BGM.audio) {
                var btn = document.getElementById("btn-bgm");
                if (btn && !btn.classList.contains("muted")) BGM.playNext();
            }
            var iframe = document.getElementById("theater-iframe");
            var cover = document.getElementById("theater-play-cover");
            if (iframe && id !== "scene-theater") {
                iframe.src = "";
            }
            if (id === "scene-theater" && iframe) {
                var src = iframe.getAttribute("data-src");
                if (src) {
                    iframe.src = src;
                    if (cover) cover.classList.add("hidden");
                } else if (cover) {
                    cover.classList.toggle("hidden", !!(iframe.src));
                }
            }
            var sceneToChar = {
                "scene-map": "yume",
                "scene-garden": "hana",
                "scene-library": "mizuki",
                "scene-gallery": "azalea",
                "scene-dailytask": "meiling",
                "scene-market": "shella",
                "scene-theater": "yume",
                "scene-divination": "sienna",
                "scene-alice-ending": "alice"
            };
            var charId = sceneToChar[id];
            if (typeof CharacterFavor !== "undefined") {
                CharacterFavor.stopStayTimer();
                if (charId) CharacterFavor.startStayTimer(charId);
            }
            if (charId && id !== "scene-alice-ending") self.setMainSpriteChar(charId);
            if (id === "scene-library" && typeof AliceFeatures !== "undefined" && AliceFeatures.renderLibraryCards) {
                AliceFeatures.renderLibraryCards();
            }
            if (id === "scene-gallery" && typeof AliceFeatures !== "undefined" && AliceFeatures.renderGalleryCollection) {
                AliceFeatures.renderGalleryCollection(function () { self.hideLoading(); });
            }
            if (id === "scene-divination" && typeof Divination !== "undefined" && Divination.init) {
                Divination.init();
            }
        };
        if (id === "scene-gallery") {
            this.showLoading("加载图鉴…");
        }
        if (id !== "scene-login" && typeof AliceFeatures !== "undefined" && AliceFeatures.showSceneTransition) {
            AliceFeatures.showSceneTransition(doSwitch);
        } else {
            doSwitch();
        }
    },

    /** 首次进入地图时对 BGM 按钮做一次柔和脉冲，引导打开 BGM（仅一次，localStorage 标记） */
    tryBgmWelcomePulse() {
        try {
            if (localStorage.getItem("alice_bgm_pulse_shown")) return;
            var btn = document.getElementById("btn-bgm");
            if (!btn) return;
            localStorage.setItem("alice_bgm_pulse_shown", "1");
            btn.classList.add("welcome-pulse");
            setTimeout(function () { btn.classList.remove("welcome-pulse"); }, 2200);
        } catch (e) {}
    },

    updateUI() {
        const s = Auth.getState();
        const nameEl = document.getElementById("display-name");
        const pointsEl = document.getElementById("display-points");
        const roleEl = document.getElementById("display-role");
        if (nameEl) nameEl.textContent = s ? s.name : "访客";
        if (pointsEl) pointsEl.textContent = s ? String(s.points) : "0";
        if (roleEl) roleEl.textContent = s ? s.role : "GUEST";
        this.updateMapLocks();
        if (typeof window.MoichanNav !== "undefined" && window.MoichanNav.updateVisibility) window.MoichanNav.updateVisibility();
    },

    updateMapLocks() {
        const citizen = Auth.isCitizen();
        document.querySelectorAll("[data-node='GARDEN']").forEach(el => {
            el.classList.toggle("locked", !citizen);
        });
        document.querySelectorAll("[data-node='MARKET']").forEach(el => {
            el.classList.toggle("locked", !citizen);
        });
    },

    async init() {
        var shell = document.getElementById("app-shell");
        if (shell && !shell._noSaveImgBound) {
            shell._noSaveImgBound = true;
            document.addEventListener("contextmenu", function (e) {
                if (e.target && e.target.tagName === "IMG" && shell.contains(e.target)) e.preventDefault();
            }, false);
        }
        this.showLoading("连接因果线…");
        var state = Auth.getState();
        var token = Auth.getToken();
        /* 刷新页面时：只要有 token 和 uid（本地缓存），直接进主页，不请求 GAS 验证 */
        if (state && state.uid && token) {
            this.worldData = null;
            this.updateUI();
            this.showScene(ALICE_CONSTANTS.SCENES.MAP);
            this.initYumeWall();
            this.tryBgmWelcomePulse();
            if (typeof AliceFeatures !== "undefined" && AliceFeatures.updateEnvironment) {
                AliceFeatures.updateEnvironment();
                setInterval(AliceFeatures.updateEnvironment, 60000);
            }
            BGM.init();
            this.hideLoading();
            return;
        }
        /* 无本地登录态则显示登录页 */
        this.showScene("scene-login");
        var fileHint = document.getElementById("login-file-hint");
        if (fileHint && this.isFileProtocol()) fileHint.classList.remove("hidden");
        if (typeof AliceFeatures !== "undefined" && AliceFeatures.updateEnvironment) {
            AliceFeatures.updateEnvironment();
            setInterval(AliceFeatures.updateEnvironment, 60000);
        }
        BGM.init();
        this.initTheaterLazyPlay();
        this.hideLoading();
    },

    /** 歌剧页：点击封面再加载 iframe，降低未进入时的解码/功耗 */
    initTheaterLazyPlay() {
        var cover = document.getElementById("theater-play-cover");
        var iframe = document.getElementById("theater-iframe");
        if (!cover || !iframe) return;
        cover.addEventListener("click", function () {
            var src = iframe.getAttribute("data-src");
            if (src) {
                iframe.src = src;
                cover.classList.add("hidden");
            }
        });
    },

    navigateTo(key) {
        if (key === "GARDEN" && !Auth.canEnterGarden()) {
            alert("仅市民可进入庭院。");
            return;
        }
        if (key === "MARKET" && !Auth.canEnterMarket()) {
            alert("仅市民可进入市集。");
            return;
        }
        var id = ALICE_CONSTANTS.SCENES[key];
        if (!id) return;
        this.showScene(id);
        if (key === "GALLERY") this.showMaidDialog("AZALEA");
        if (key === "MARKET") this.showMaidDialog("SHELLA");
        if (key === "LIBRARY") this.showMaidDialog("MIZUKI");
        if (key === "DAILYTASK") this.showMaidDialog("MEILING");
        if (key === "GARDEN") this.enterGarden();
        if (key === "DIVINATION") this.showMaidDialog("SIENNA");
    },

    showMaidDialog(maid) {
        const arr = ALICE_CONSTANTS.DIALOGUES[maid];
        if (Array.isArray(arr) && arr.length) {
            const msg = arr[Math.floor(Math.random() * arr.length)];
            console.log("[" + maid + "] " + msg);
        }
    },

    async enterGarden() {
        var progress = Game.loadProgress();
        if (progress && progress.cardId && progress.answers && progress.answers.length < ALICE_CONSTANTS.BALANCE.QUIZ_COUNT) {
            await this.resumeQuiz(progress);
            return;
        }
        var today = new Date().toISOString().split("T")[0];
        var uid = (Auth.getState() && Auth.getState().uid) ? String(Auth.getState().uid) : "guest";
        var cacheKey = ALICE_CONSTANTS.STORAGE.HANA_WELCOME_CACHE + "_" + uid;
        var cached = null;
        try {
            var raw = localStorage.getItem(cacheKey);
            if (raw) {
                var obj = JSON.parse(raw);
                if (obj && obj.date === today && obj.welcome) {
                    this.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
                    UI.showGardenHome();
                    return;
                }
            }
        } catch (e) {}
        this.showLoading("Hana 前往中…");
        var welcome;
        try {
            welcome = await this.getHanaWelcome(today, cacheKey);
        } finally {
            this.hideLoading();
        }
        await this.playHanaPrologue(welcome);
        this.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
        UI.showGardenHome();
    },

    /** 迎宾词：仅当当天无缓存时调用（每用户每天最多调一次 Hana API），50–80 字 */
    async getHanaWelcome(today, cacheKey) {
        var state = Auth.getState();
        if (!state || !Auth.getToken()) {
            var fallback = "欢迎来到因果之庭，抽一张卡吧。";
            try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, welcome: fallback })); } catch (e) {}
            return fallback;
        }
        var url = ALICE_CONSTANTS.GAS_URL;
        var payload = {
            action: ALICE_CONSTANTS.ACTIONS.HANA_WELCOME,
            uid: state.uid,
            token: Auth.getToken()
        };
        try {
            await fetch(url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
        } catch (e) {}
        var res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            var fallback = "欢迎来到因果之庭，抽一张卡吧。";
            try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, welcome: fallback })); } catch (e) {}
            return fallback;
        }
        var rawText = await res.text();
        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            var fallback = "欢迎来到因果之庭，抽一张卡吧。";
            try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, welcome: fallback })); } catch (e) {}
            return fallback;
        }
        var welcome = (data && data.welcome) ? String(data.welcome).slice(0, 100) : "欢迎来到因果之庭，抽一张卡吧。";
        try {
            localStorage.setItem(cacheKey, JSON.stringify({ date: today, welcome: welcome }));
        } catch (e) {}
        return welcome;
    },

    /** Hana 迎宾 section：气泡框慢速打字 50–80 字 */
    playHanaPrologue(text) {
        return new Promise(function(resolve) {
            var overlay = document.getElementById("hana-prologue");
            var textEl = document.getElementById("hana-text");
            var sprite = document.getElementById("hana-sprite");
            if (!overlay || !textEl) return resolve();
            if (sprite && typeof CharacterFavor !== "undefined") CharacterFavor.setSprite(sprite, "hana", "prologue");
            overlay.classList.remove("hidden");
            textEl.textContent = "";
            var i = 0;
            var interval = 65;
            var t = setInterval(function() {
                textEl.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(t);
                    var done = function() {
                        overlay.classList.add("hidden");
                        if (sprite) sprite.classList.remove("hana-dissolve");
                        resolve();
                    };
                    overlay.onclick = function() {
                        if (sprite) sprite.classList.add("hana-dissolve");
                        setTimeout(done, 1200);
                    };
                }
            }, interval);
        });
    },

    async resumeQuiz(progress) {
        Game.questionIndex = progress.questionIndex || 0;
        Game.answers = progress.answers || [];
        if (progress.cardId) {
            try {
                const r = await fetch("assets/data/cards/" + progress.cardId + ".json");
                Game.currentDetail = await r.json();
            } catch (e) {
                Game.currentDetail = { id: progress.cardId, questions: [] };
            }
        } else {
            Game.currentDetail = null;
        }
        await UI.runGalgameFlow({ detail: Game.currentDetail, startFromIndex: progress.questionIndex || 0 });
        this.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
        App.finishQuiz();
    },

    async handleLogin() {
        const uid = document.getElementById("input-uid")?.value?.trim();
        const pwd = document.getElementById("input-pwd")?.value;
        if (!uid || !pwd) {
            alert("请填写 UID 与密码");
            return;
        }
        this.showLoading("身份认证中…");
        try {
            await Auth.login(uid, pwd);
            const out = await Auth.refreshFromGAS();
            if (out) this.worldData = out.world;
            this.updateUI();
            this.hideLoading();
            if (typeof OpenDoorTransition !== "undefined" && OpenDoorTransition.run) {
                OpenDoorTransition.run(function () {
                    this.showScene(ALICE_CONSTANTS.SCENES.MAP);
                    this.initYumeWall();
                    this.tryBgmWelcomePulse();
                }.bind(this));
            } else {
                this.showScene(ALICE_CONSTANTS.SCENES.MAP);
                this.initYumeWall();
                this.tryBgmWelcomePulse();
            }
        } catch (e) {
            this.hideLoading();
            alert(e.message || "认证失败");
        }
    },

    /** 是否以 file 协议打开（易导致 Failed to fetch） */
    isFileProtocol() {
        return /^file:\/\//i.test(location.href);
    },

    async initYumeWall() {
        var container = document.getElementById("wall-messages");
        if (!container) return;
        try {
            var url = ALICE_CONSTANTS.WALL_URL + "?action=wall_fetch";
            var res = await fetch(url);
            var rawText = await res.text();
            var data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                data = {};
            }
            var list = Array.isArray(data) ? data : (data.messages || data.list || []);
            container.innerHTML = list.slice(0, 50).map(function(m) {
                var msg = typeof m === "string" ? m : (m.text || m.content || m.comment || "");
                var who = (m && m.userName) ? " — " + escapeHtml(m.userName) : "";
                return "<div class=\"wall-msg\">" + escapeHtml(msg) + who + "</div>";
            }).join("") || "<div class='wall-msg'>暂无留言</div>";
        } catch (e) {
            container.innerHTML = "<div class='wall-msg'>暂无留言</div>";
        }
    },

    async handleWallPost() {
        var input = document.getElementById("wall-input");
        var msg = input ? input.value.trim() : "";
        if (!msg) return;
        var state = Auth.getState();
        this.showLoading("同步中…");
        try {
            var payload = {
                action: "wall_post",
                uid: state ? state.uid : "",
                message: msg,
                name: state ? state.name : "访客"
            };
            var res = await fetch(ALICE_CONSTANTS.WALL_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            var rawText = await res.text();
            var data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                data = { result: "error" };
            }
            if (data.result === "success") {
                input.value = "";
                this.initYumeWall();
            } else {
                alert(data.message || "发送失败");
            }
        } catch (e) {
            alert("发送失败");
        }
        this.hideLoading();
    },

    async handleCheckin() {
        const state = Auth.getState();
        if (!state) return;
        const last = localStorage.getItem(ALICE_CONSTANTS.STORAGE.LAST_CHECKIN);
        const today = new Date().toISOString().split("T")[0];
        if (last === today) {
            alert("今日已祈愿");
            return;
        }
        this.showLoading("祈愿中…");
        try {
            const res = await fetch(ALICE_CONSTANTS.GAS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: ALICE_CONSTANTS.ACTIONS.CHECKIN,
                    uid: state.uid,
                    token: Auth.getToken()
                })
            });
            var rawText = await res.text();
            var data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                alert("祈愿未能传达");
                this.hideLoading();
                return;
            }
            if (data.result === "success") {
                Auth.updateLocal({ points: data.newPoints ?? state.points + ALICE_CONSTANTS.BALANCE.DAILY_REWARD });
                localStorage.setItem(ALICE_CONSTANTS.STORAGE.LAST_CHECKIN, today);
                this.updateUI();
                alert("祈愿成功，因果值 +" + ALICE_CONSTANTS.BALANCE.DAILY_REWARD);
            } else {
                alert(data.message || "祈愿失败");
            }
        } catch (e) {
            alert("祈愿未能传达");
        }
        this.hideLoading();
    },

    logout() {
        Auth.logout();
        location.reload();
    }
};

function escapeHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
}

/** UI 层：抽卡、卡牌故事、10 题、终局展示、商店、BGM */
const UI = {
    showGardenHome() {
        var container = document.getElementById("quiz-container");
        if (!container) return;
        var cardBackPath = ALICE_CONSTANTS.PATHS.CARD_BACK || "assets/ui/card_back.webp";
        container.innerHTML = `
            <div class="quiz-header breath-hana">Hana · 迎宾</div>
            <p class="question-text">抽一张卡，我会为你讲述它的故事；十题之后，Alice 会为你写下终局。</p>
            <div class="gacha-card-back-wrap">
                <img id="gacha-card-back" class="gacha-card-back" src="${escapeHtml(cardBackPath)}" alt="卡背" title="点击卡背抽卡">
                <p class="gacha-card-hint">点击卡背抽卡</p>
            </div>
        `;
        var cardBack = document.getElementById("gacha-card-back");
        if (cardBack) {
            cardBack.draggable = false;
            cardBack.onerror = function() { this.style.display = "none"; };
            cardBack.onclick = function() { App.startGachaFlow(); };
        }
    },

    /** Galgame 开场：过场动画 + fixedStory 慢速打字 */
    async showCardStory(detail) {
        return UI.runGalgameFlow({ detail: detail, startFromIndex: 0 });
    },

    /**
     * Galgame 独立区：开场 + 10 题（dialogs 气泡 → 问题 → 选择/手写）
     * - 仅操作 #card-story-overlay 内元素，不调用 CharacterFavor，不影响 #stage-area 主立绘
     * - 固定流程（name + fixedStory + question + answer → GAS）由 Game.buildFatePayload / submitToAlice 处理，此处不改
     */
    async runGalgameFlow(opts) {
        var detail = opts.detail || Game.currentDetail;
        var startFromIndex = opts.startFromIndex || 0;
        if (!detail) return;

        var overlay = document.getElementById("card-story-overlay");
        var bgEl = document.getElementById("galgame-bg");
        var cardImgWrap = document.getElementById("galgame-card-img-wrap");
        var cardImg = document.getElementById("card-story-card-img");
        var charWrap = document.getElementById("galgame-character-wrap");
        var sprite = document.getElementById("card-story-sprite");
        var dialogueBox = document.getElementById("galgame-dialogue-box");
        var nameEl = document.getElementById("card-story-name");
        var textEl = document.getElementById("card-story-text");
        var nextEl = document.getElementById("card-story-next");
        var choicesWrap = document.getElementById("galgame-choices-wrap");
        var choicesEl = document.getElementById("galgame-choices");
        var manualWrap = document.getElementById("galgame-manual-wrap");
        var manualInput = document.getElementById("galgame-manual-input");
        var manualSubmit = document.getElementById("galgame-manual-submit");

        if (!overlay || !textEl) return;

        var CHAR_DELAY = 45;
        var GALGAME_POS_KEY = "AliceGarden_GalgameHanaPos";
        var GALGAME_HIDDEN_KEY = "AliceGarden_GalgameHanaHidden";

        /** 独立区：galgame 立绘位置与隐藏（仅本浮层，与 #stage-area 无关） */
        function initGalgameCharacterDragAndHide() {
            if (!charWrap) return;
            if (charWrap.dataset.galgameDragInited) {
                var hideBtn = document.getElementById("galgame-character-hide-btn");
                try {
                    var raw = localStorage.getItem(GALGAME_POS_KEY);
                    if (raw) {
                        var o = JSON.parse(raw);
                        if (o && typeof o.right === "number" && typeof o.bottom === "number") {
                            charWrap.style.right = o.right + "px";
                            charWrap.style.bottom = o.bottom + "px";
                            charWrap.style.left = "auto";
                        }
                    } else {
                        charWrap.style.right = "0";
                        charWrap.style.bottom = "0";
                        charWrap.style.left = "auto";
                    }
                    var hidden = localStorage.getItem(GALGAME_HIDDEN_KEY) === "true";
                    charWrap.classList.toggle("galgame-character-hidden", hidden);
                    if (hideBtn) { hideBtn.textContent = hidden ? "显示" : "隐藏"; }
                } catch (e) {}
                return;
            }
            charWrap.dataset.galgameDragInited = "1";
            var hideBtn = document.getElementById("galgame-character-hide-btn");
            var drag = { active: false, startX: 0, startY: 0 };

            function loadPos() {
                try {
                    var raw = localStorage.getItem(GALGAME_POS_KEY);
                    if (raw) {
                        var o = JSON.parse(raw);
                        if (o && typeof o.right === "number" && typeof o.bottom === "number") {
                            charWrap.style.right = o.right + "px";
                            charWrap.style.bottom = o.bottom + "px";
                            charWrap.style.left = "auto";
                            return;
                        }
                    }
                } catch (e) {}
                charWrap.style.right = "0";
                charWrap.style.bottom = "0";
                charWrap.style.left = "auto";
            }

            function savePos() {
                try {
                    var rect = charWrap.getBoundingClientRect();
                    var wrap = overlay.getBoundingClientRect();
                    localStorage.setItem(GALGAME_POS_KEY, JSON.stringify({
                        right: Math.round(wrap.right - rect.right),
                        bottom: Math.round(wrap.bottom - rect.bottom)
                    }));
                } catch (e) {}
            }

            function applyHidden() {
                try {
                    var hidden = localStorage.getItem(GALGAME_HIDDEN_KEY) === "true";
                    charWrap.classList.toggle("galgame-character-hidden", hidden);
                    if (hideBtn) {
                        hideBtn.textContent = hidden ? "显示" : "隐藏";
                        hideBtn.setAttribute("aria-label", hidden ? "显示立绘" : "隐藏立绘");
                    }
                } catch (e) {}
            }

            loadPos();
            applyHidden();

            if (hideBtn) {
                hideBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        var hidden = localStorage.getItem(GALGAME_HIDDEN_KEY) !== "true";
                        localStorage.setItem(GALGAME_HIDDEN_KEY, hidden ? "true" : "false");
                        applyHidden();
                    } catch (err) {}
                };
            }

            function onPointerDown(e) {
                if (hideBtn && (e.target === hideBtn || hideBtn.contains(e.target))) return;
                drag.active = true;
                drag.startX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                drag.startY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            }

            function onPointerMove(e) {
                if (!drag.active) return;
                e.preventDefault();
                var x = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
                var y = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
                var dx = x - drag.startX;
                var dy = y - drag.startY;
                drag.startX = x;
                drag.startY = y;
                var rect = charWrap.getBoundingClientRect();
                var wrap = overlay.getBoundingClientRect();
                var curRight = wrap.right - rect.right;
                var curBottom = wrap.bottom - rect.bottom;
                var newRight = Math.max(0, Math.min(wrap.width - 50, curRight - dx));
                var newBottom = Math.max(0, Math.min(wrap.height - 50, curBottom - dy));
                charWrap.style.right = newRight + "px";
                charWrap.style.bottom = newBottom + "px";
                charWrap.style.left = "auto";
            }

            function onPointerUp() {
                if (drag.active) {
                    drag.active = false;
                    savePos();
                }
            }

            charWrap.addEventListener("pointerdown", onPointerDown, { passive: true });
            overlay.addEventListener("pointermove", onPointerMove, { passive: false });
            overlay.addEventListener("pointerup", onPointerUp, { passive: true });
            overlay.addEventListener("pointerleave", onPointerUp, { passive: true });
        }

        /** 独立区：仅设置 galgame 浮层内 Hana 立绘，不调用 CharacterFavor，不影响其他模块 */
        function setGalgameHanaEmotion(emotion) {
            if (!sprite) return;
            var emo = (emotion || "default").trim();
            var path = (emo === "default") ? "assets/characters/hanadefault.webp" : "assets/characters/hana_" + emo + ".webp";
            sprite.removeAttribute("data-char-id");
            sprite.classList.remove("js-favor-sprite");
            sprite.draggable = false;
            sprite.alt = "Hana";
            sprite.onerror = function() {
                if (sprite.dataset.galgameFallback === "1") {
                    sprite.src = (typeof window !== "undefined" && window.ASSET_PLACEHOLDER) ? window.ASSET_PLACEHOLDER : "";
                    sprite.onerror = null;
                    return;
                }
                sprite.dataset.galgameFallback = "1";
                sprite.src = "assets/characters/hanadefault.webp";
            };
            delete sprite.dataset.galgameFallback;
            sprite.src = path;
        }

        function setBackground() {
            if (bgEl && detail.background) {
                bgEl.style.backgroundImage = "url(" + (detail.background || "").replace(/\/+/g, "/") + ")";
                bgEl.style.display = "";
            } else if (bgEl) bgEl.style.display = "none";
        }

        function setCardImg() {
            if (cardImg && detail.id) {
                var dir = ALICE_CONSTANTS.PATHS.CARDS_IMAGES || "assets/cards/";
                cardImg.src = (dir + detail.id + ".webp").replace(/\/+/g, "/");
                cardImg.alt = detail.name || detail.id;
                cardImg.style.display = "";
                if (cardImgWrap) cardImgWrap.classList.remove("hidden");
            } else {
                if (cardImg) cardImg.style.display = "none";
                if (cardImgWrap) cardImgWrap.classList.add("hidden");
            }
        }

        function hideChoices() {
            if (choicesWrap) choicesWrap.classList.add("hidden");
            if (choicesEl) choicesEl.innerHTML = "";
            if (manualWrap) {
                manualWrap.classList.add("hidden");
                if (manualInput) manualInput.value = "";
            }
        }

        function showDialogueBox() {
            if (dialogueBox) dialogueBox.classList.remove("hidden");
            hideChoices();
            if (nextEl) nextEl.classList.remove("hidden");
        }

        function showChoices(q) {
            if (dialogueBox) dialogueBox.classList.add("hidden");
            if (choicesWrap) choicesWrap.classList.remove("hidden");
            if (choicesEl) choicesEl.innerHTML = "";
            var showManualNow = q.type === "manual";
            if (manualWrap) manualWrap.classList.toggle("hidden", !showManualNow);
            if (manualInput) manualInput.maxLength = ALICE_CONSTANTS.BALANCE.ANSWER_MAX_LEN || 30;
        }

        function typewriter(el, text, delay) {
            return new Promise(function(resolve) {
                if (!el) return resolve();
                el.textContent = "";
                var i = 0;
                var t = setInterval(function() {
                    el.textContent += text.charAt(i);
                    i++;
                    if (i >= text.length) {
                        clearInterval(t);
                        resolve();
                    }
                }, delay || CHAR_DELAY);
            });
        }

        function waitClick() {
            return new Promise(function(resolve) {
                var handler = function() {
                    overlay.removeEventListener("click", handler);
                    resolve();
                };
                overlay.addEventListener("click", handler);
            });
        }

        setBackground();
        setCardImg();
        setGalgameHanaEmotion("default");
        if (nameEl) nameEl.textContent = "Hana";
        showDialogueBox();
        overlay.classList.remove("hidden");
        initGalgameCharacterDragAndHide();

        if (startFromIndex === 0 && (detail.fixedStory || "").trim()) {
            await typewriter(textEl, detail.fixedStory.trim(), CHAR_DELAY);
            nextEl.textContent = "点击继续";
            await waitClick();
        }

        var questions = Game.getQuestions();
        for (var idx = startFromIndex; idx < ALICE_CONSTANTS.BALANCE.QUIZ_COUNT; idx++) {
            var q = questions[idx];
            if (!q) continue;

            setGalgameHanaEmotion(q.emotion);

            if (q.dialogs && q.dialogs.length > 0) {
                showDialogueBox();
                for (var d = 0; d < q.dialogs.length; d++) {
                    textEl.textContent = "";
                    await typewriter(textEl, q.dialogs[d], CHAR_DELAY);
                    nextEl.textContent = "点击继续";
                    await waitClick();
                }
            }

            showDialogueBox();
            textEl.textContent = "";
            await typewriter(textEl, q.text, CHAR_DELAY);
            nextEl.textContent = "点击继续";
            await waitClick();

            showChoices(q);
            var answerPromise = new Promise(function(resolveAnswer) {
                var resolved = false;
                function submitAnswer(val) {
                    if (resolved) return;
                    resolved = true;
                    hideChoices();
                    Game.answer(val);
                    Game.saveProgress();
                    resolveAnswer();
                }

                if (q.type === "choice" || (q.type === "choice_manual" && q.options && q.options.length > 0)) {
                    (q.options || []).forEach(function(opt) {
                        var btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = "galgame-choice-btn";
                        btn.textContent = opt;
                        btn.onclick = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            submitAnswer(opt);
                        };
                        if (choicesEl) choicesEl.appendChild(btn);
                    });
                    if (q.manualInput) {
                        var manualBtn = document.createElement("button");
                        manualBtn.type = "button";
                        manualBtn.className = "galgame-choice-btn galgame-choice-manual";
                        manualBtn.textContent = "手动输入…";
                        manualBtn.onclick = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (manualWrap) manualWrap.classList.remove("hidden");
                            if (manualInput) manualInput.focus();
                        };
                        if (choicesEl) choicesEl.appendChild(manualBtn);
                    }
                }

                if (q.type === "manual" || q.manualInput) {
                    if (manualWrap) manualWrap.classList.remove("hidden");
                    if (manualInput) {
                        manualInput.placeholder = "在此输入你的回答…";
                        manualInput.value = "";
                        manualInput.focus();
                    }
                    var doManualSubmit = function(e) {
                        if (e) { e.preventDefault(); e.stopPropagation(); }
                        var val = manualInput ? manualInput.value.trim() : "";
                        if (!val) {
                            alert("请输入你的回答。");
                            return;
                        }
                        submitAnswer(val);
                    };
                    if (manualSubmit) manualSubmit.onclick = function(e) { doManualSubmit(e); };
                    if (manualInput) {
                        manualInput.onkeydown = function(ev) {
                            if (ev.key === "Enter") { ev.preventDefault(); doManualSubmit(); }
                        };
                    }
                }
            });
            await answerPromise;
        }

        overlay.classList.add("hidden");
        hideChoices();
    },

    renderQuiz() {
        var questions = Game.getQuestions();
        var idx = Game.answers.length;
        if (idx >= ALICE_CONSTANTS.BALANCE.QUIZ_COUNT) {
            App.finishQuiz();
            return;
        }
        var q = questions[idx];
        var container = document.getElementById("quiz-container");
        if (!container) return;
        var maxLen = ALICE_CONSTANTS.BALANCE.ANSWER_MAX_LEN || 30;
        container.innerHTML = `
            <div class="quiz-header quiz-header-style2">${idx + 1} / ${ALICE_CONSTANTS.BALANCE.QUIZ_COUNT}</div>
            <div class="question-text dream-question-text">${escapeHtml(q.text)}</div>
            <div class="quiz-input-wrap form-group">
                <label class="quiz-input-label">你的回答（最多 ${maxLen} 字）</label>
                <input type="text" id="quiz-answer-input" class="quiz-answer-input" placeholder="在此输入…" maxlength="${maxLen}" autocomplete="off">
                <span class="quiz-char-count" id="quiz-char-count">0 / ${maxLen}</span>
            </div>
            <button type="button" class="quiz-submit-btn glow-button" id="quiz-submit-btn">提交</button>
        `;
        var inputEl = document.getElementById("quiz-answer-input");
        var countEl = document.getElementById("quiz-char-count");
        var submitBtn = document.getElementById("quiz-submit-btn");
        function updateCount() {
            var len = (inputEl && inputEl.value) ? inputEl.value.length : 0;
            if (countEl) countEl.textContent = len + " / " + maxLen;
        }
        if (inputEl) {
            inputEl.addEventListener("input", updateCount);
            inputEl.addEventListener("keydown", function(ev) {
                if (ev.key === "Enter") submitBtn && submitBtn.click();
            });
            inputEl.focus();
        }
        if (submitBtn) {
            submitBtn.onclick = function() {
                var text = inputEl ? inputEl.value.trim() : "";
                if (!text) {
                    alert("请输入你的回答。");
                    return;
                }
                if (text.length > maxLen) {
                    alert("回答不能超过 " + maxLen + " 字。");
                    return;
                }
                Game.answer(text);
                Game.saveProgress();
                App.setMainSpriteChar("hana");
                UI.renderQuiz();
            };
        }
    },

    showFate(fateText) {
        var overlay = document.getElementById("alice-fate");
        var content = document.getElementById("fate-content");
        var downloadBtn = document.getElementById("fate-download");
        if (!overlay || !content) return;
        App.setMainSpriteChar("alice");
        content.textContent = (fateText && String(fateText).trim()) ? fateText : "（终局文本尚未生成，请稍后重试或检查 GAS generate_fate 接口。）";
        overlay.classList.remove("hidden");
        if (downloadBtn) {
            downloadBtn.onclick = () => Game.downloadEnding(fateText || "", Game.currentDetail && Game.currentDetail.name);
        }
    },

    /** 在 Alice 终局独立 section 中显示结局气泡（兼容旧逻辑） */
    showFateInSection(fateText) {
        UI.showFateInSectionGalgame(fateText);
    },

    /** 全屏 loading 过场（GAS 请求中）：不立即加载 Alice 立绘 */
    showAliceEndingLoading() {
        var loading = document.getElementById("alice-ending-loading");
        var stage = document.getElementById("alice-ending-stage");
        var waitEl = document.getElementById("alice-ending-wait");
        var video = document.getElementById("alice-ending-loading-video");
        if (stage) stage.classList.add("hidden");
        if (waitEl) waitEl.classList.add("hidden");
        if (loading) loading.classList.remove("hidden");
        if (video) {
            var src = (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.ALICE_ENDING_LOADING_VIDEO) || "assets/videos/ending_loading.webm";
            video.src = src;
            video.play().catch(function() {});
        }
    },

    /** Galgame 终局流程：隐藏 loading → webm 背景 + 歌词滚动 → 白/黑/glitch 效果 → 肃静空白 + 两按钮 */
    showFateInSectionGalgame(fateText) {
        var loading = document.getElementById("alice-ending-loading");
        var stage = document.getElementById("alice-ending-stage");
        var videoEl = document.getElementById("alice-ending-video");
        var lyricWrap = document.getElementById("alice-ending-lyric-wrap");
        var lyricText = document.getElementById("alice-ending-lyric-text");
        var effectEl = document.getElementById("alice-ending-effect");
        var finalEl = document.getElementById("alice-ending-final");
        var downloadBtn = document.getElementById("alice-ending-download");
        var closeBtn = document.getElementById("alice-ending-close");

        if (!stage || !lyricText) return;

        var text = (fateText && String(fateText).trim()) ? fateText : "（终局文本尚未生成。）";

        if (loading) loading.classList.add("hidden");
        stage.classList.remove("hidden");
        if (effectEl) {
            effectEl.classList.remove("white-book", "black-book", "glitch");
        }
        if (finalEl) finalEl.classList.add("hidden");

        lyricText.textContent = text;
        lyricText.classList.remove("done", "animating");
        lyricText.style.animation = "none";

        var videoSrc = (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.ALICE_ENDING_VIDEO) || "assets/videos/alice_ending.webm";
        if (videoEl) {
            videoEl.classList.remove("playing", "fade-out");
            videoEl.src = videoSrc;
            videoEl.loop = true;
            videoEl.play().catch(function() {});
            setTimeout(function() { videoEl.classList.add("playing"); }, 100);
            videoEl.onended = function() {
                videoEl.classList.add("fade-out");
            };
        }

        var effectDuration = 2800;
        var hasWhite = text.indexOf("白之书") !== -1;
        var hasBlack = text.indexOf("黑之书") !== -1;
        function applyEffect() {
            if (!effectEl) return;
            if (hasWhite) effectEl.classList.add("white-book");
            else if (hasBlack) effectEl.classList.add("black-book");
            else effectEl.classList.add("glitch");
        }

        function showFinal() {
            if (lyricWrap) lyricWrap.classList.add("hidden");
            if (finalEl) finalEl.classList.remove("hidden");
            if (downloadBtn) downloadBtn.onclick = function() { Game.downloadEnding(fateText || "", Game.currentDetail && Game.currentDetail.name); };
            if (closeBtn) closeBtn.onclick = function() { App.navigateTo("MAP"); };
        }

        var lyricPaused = false;
        var lyricRafId = null;
        var lyricCurrentY = 0;
        var lyricInitialY = 0;
        var lyricMinY = 0;
        var lyricSpeed = 0;
        var lyricDurationSec = 45;
        var lyricEnded = false;
        var scrollResumeTimer = null;

        function setLyricTransform(px) {
            if (lyricText) lyricText.style.transform = "translateY(" + px + "px)";
        }

        function runLyricTick(now) {
            if (lyricEnded || !lyricText) return;
            if (lyricPaused) {
                lyricRafId = requestAnimationFrame(runLyricTick);
                return;
            }
            var dt = (now - (runLyricTick.last || now)) / 1000;
            runLyricTick.last = now;
            lyricCurrentY -= lyricSpeed * dt;
            if (lyricCurrentY < lyricMinY) lyricCurrentY = lyricMinY;
            setLyricTransform(lyricCurrentY);
            if (lyricCurrentY <= lyricMinY) {
                lyricEnded = true;
                if (lyricText) lyricText.classList.add("done");
                applyEffect();
                setTimeout(showFinal, effectDuration);
                return;
            }
            lyricRafId = requestAnimationFrame(runLyricTick);
        }

        function startLyricAnimation() {
            var wrap = lyricWrap;
            var h = lyricText ? lyricText.scrollHeight : 0;
            var wrapH = wrap ? wrap.clientHeight : 400;
            if (h > 0) lyricDurationSec = Math.max(35, Math.min(120, Math.round(h / 55) + 20));
            /* 字幕从框的垂直中间开始：让首行出现在框中部 */
            lyricInitialY = Math.max(0, Math.round(h - wrapH / 2));
            lyricMinY = -Math.max(h, 100);
            lyricCurrentY = lyricInitialY;
            lyricSpeed = (lyricInitialY + Math.max(h, 100)) / lyricDurationSec;
            lyricEnded = false;
            runLyricTick.last = performance.now();
            setLyricTransform(lyricCurrentY);
            if (lyricRafId != null) cancelAnimationFrame(lyricRafId);
            lyricRafId = requestAnimationFrame(runLyricTick);
        }

        function pauseLyricScroll() {
            lyricPaused = true;
        }
        function resumeLyricScroll() {
            lyricPaused = false;
        }
        function onLyricWheel(e) {
            e.preventDefault();
            pauseLyricScroll();
            lyricCurrentY += e.deltaY;
            if (lyricCurrentY > lyricInitialY) lyricCurrentY = lyricInitialY;
            if (lyricCurrentY < lyricMinY) lyricCurrentY = lyricMinY;
            setLyricTransform(lyricCurrentY);
            clearTimeout(scrollResumeTimer);
            scrollResumeTimer = setTimeout(resumeLyricScroll, 320);
        }
        function onLyricTouchStart(e) {
            if (e.touches.length !== 1) return;
            lyricTouchStartY = e.touches[0].clientY;
            lyricTouchStartScrollY = lyricCurrentY;
        }
        var lyricTouchStartY = 0, lyricTouchStartScrollY = 0;
        function onLyricTouchMove(e) {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            var y = e.touches[0].clientY;
            var delta = lyricTouchStartY - y;
            lyricTouchStartY = y;
            lyricTouchStartScrollY += delta;
            lyricCurrentY = lyricTouchStartScrollY;
            if (lyricCurrentY > lyricInitialY) lyricCurrentY = lyricInitialY;
            if (lyricCurrentY < lyricMinY) lyricCurrentY = lyricMinY;
            setLyricTransform(lyricCurrentY);
            pauseLyricScroll();
        }
        function onLyricTouchEnd() {
            scrollResumeTimer = setTimeout(resumeLyricScroll, 280);
        }

        var stageEl = document.getElementById("alice-ending-stage");
        if (stageEl) {
            stageEl.addEventListener("pointerdown", pauseLyricScroll, { passive: true });
            stageEl.addEventListener("pointerup", resumeLyricScroll, { passive: true });
            stageEl.addEventListener("pointerleave", resumeLyricScroll, { passive: true });
        }
        if (lyricWrap) {
            lyricWrap.addEventListener("pointerdown", pauseLyricScroll, { passive: true });
            lyricWrap.addEventListener("pointerup", resumeLyricScroll, { passive: true });
            lyricWrap.addEventListener("pointerleave", resumeLyricScroll, { passive: true });
            lyricWrap.addEventListener("wheel", onLyricWheel, { passive: false });
            lyricWrap.addEventListener("touchstart", onLyricTouchStart, { passive: true });
            lyricWrap.addEventListener("touchmove", onLyricTouchMove, { passive: false });
            lyricWrap.addEventListener("touchend", onLyricTouchEnd, { passive: true });
            lyricWrap.addEventListener("touchcancel", onLyricTouchEnd, { passive: true });
        }
        var lyricPauseBtn = document.getElementById("alice-ending-lyric-pause-btn");
        if (lyricPauseBtn) {
            lyricPauseBtn.addEventListener("pointerdown", function(e) { e.preventDefault(); pauseLyricScroll(); }, { passive: false });
            lyricPauseBtn.addEventListener("pointerup", resumeLyricScroll, { passive: true });
            lyricPauseBtn.addEventListener("pointerleave", resumeLyricScroll, { passive: true });
        }

        requestAnimationFrame(function() {
            startLyricAnimation();
        });
    },

    /** 进入 Alice 终局 section 时显示全屏 loading，不切 Alice 立绘 */
    showAliceEndingWait() {
        UI.showAliceEndingLoading();
    }
};

App.startGachaFlow = async function() {
    const state = Auth.getState();
    const cost = ALICE_CONSTANTS.BALANCE.GACHA_COST;
    if (state && state.points < cost) {
        alert("因果值不足 " + cost + "，请至市集兑换或完成每日任务。");
        return;
    }
    var self = this;
    self.showConfirm("抽卡将消耗 " + cost + " 因果值，是否确认？", async function () {
        self.showLoading("庭院正在准备中…");
        try {
            const detail = await Game.drawCard();
            var s = Auth.getState();
            if (s) Auth.updateLocal({ points: (s.points || 0) - cost });
            self.updateUI();
            self.hideLoading();
            Game.currentDetail = detail;
            Game.saveProgress();
            await UI.showCardStory(detail);
            self.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
            App.finishQuiz();
        } catch (e) {
            self.hideLoading();
            alert(e.message || "抽卡失败");
        }
    }, function () {});
};

App.finishQuiz = async function() {
    this.showScene(ALICE_CONSTANTS.SCENES.ALICE_ENDING);
    UI.showAliceEndingWait();
    try {
        var fateText = await Game.submitToAlice();
        var state = Auth.getState();
        var cards = (state && state.cards && Array.isArray(state.cards)) ? state.cards.slice() : [];
        if (Game.currentDetail && Game.currentDetail.id) {
            var id = String(Game.currentDetail.id).trim();
            if (id && cards.indexOf(id) === -1) cards.push(id);
        }
        if (cards.length) Auth.updateLocal({ cards: cards });
        Game.clearProgress();
        await Game.updateMemoryOnGAS(fateText);
        this.updateUI();
        UI.showFateInSection(fateText);
    } catch (e) {
        alert(e.message || "终局生成失败");
        this.navigateTo("MAP");
    }
};

const BGM = {
    audio: null,
    /** 当前播放到列表中的索引，播完后播下一首并循环 */
    _playIndex: 0,
    getNextSrc() {
        var list = ALICE_CONSTANTS.BGM_FILES;
        var dir = ALICE_CONSTANTS.PATHS.BGM_DIR || "assets/bgm/";
        if (!list || list.length === 0) return dir + "theme.mp3";
        var file = list[this._playIndex % list.length];
        return (dir + file).replace(/\/+/g, "/");
    },
    /** 按顺序播下一首（theme → ed → theme …） */
    playNext() {
        if (!this.audio) return;
        this.audio.removeAttribute("loop");
        this.audio.src = this.getNextSrc();
        this.audio.load();
        this.audio.play().catch(function() {});
        var list = ALICE_CONSTANTS.BGM_FILES;
        if (list && list.length > 0) this._playIndex = (this._playIndex + 1) % list.length;
    },
    init() {
        var self = this;
        var saved = localStorage.getItem(ALICE_CONSTANTS.STORAGE.BGM_ENABLED);
        var on = saved !== "false";
        var btn = document.getElementById("btn-bgm");
        if (btn) {
            btn.classList.toggle("muted", !on);
            btn.textContent = on ? "♪" : "♫";
            btn.onclick = function() { self.toggle(); };
        }
        if (this.audio) {
            this.audio.addEventListener("ended", function() {
                if (btn && !btn.classList.contains("muted")) self.playNext();
            });
            if (on) {
                this._playIndex = 0;
                this.playNext();
            }
        }
    },
    toggle() {
        var btn = document.getElementById("btn-bgm");
        var current = btn && !btn.classList.contains("muted");
        var next = !current;
        localStorage.setItem(ALICE_CONSTANTS.STORAGE.BGM_ENABLED, next ? "true" : "false");
        if (btn) {
            btn.classList.toggle("muted", !next);
            btn.textContent = next ? "♪" : "♫";
        }
        if (this.audio) {
            if (next) {
                this._playIndex = 0;
                this.playNext();
            } else {
                this.audio.pause();
            }
        }
    }
};

window.handleWallPost = () => App.handleWallPost();
window.App = App;
