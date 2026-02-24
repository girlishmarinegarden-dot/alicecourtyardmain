/**
 * 主流程：code2.gs(GAS_URL)=登录/签到/fetch_core；code.gs(WALL_URL)=留言墙 wall_fetch/wall_post
 */
const App = {
    worldData: null,

    showLoading(text) {
        var el = document.getElementById("loading-overlay");
        var txt = document.getElementById("loading-text");
        if (txt) txt.textContent = text || "请稍候…";
        if (el) el.classList.remove("hidden");
    },

    hideLoading() {
        const el = document.getElementById("loading-overlay");
        if (el) el.classList.add("hidden");
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
            if (charId) self.setMainSpriteChar(charId);
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
        this.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
        UI.renderQuiz();
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
            this.showScene(ALICE_CONSTANTS.SCENES.MAP);
            this.initYumeWall();
        } catch (e) {
            alert(e.message || "认证失败");
        }
        this.hideLoading();
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

    async showCardStory(detail) {
        var overlay = document.getElementById("card-story-overlay");
        var nameEl = document.getElementById("card-story-name");
        var textEl = document.getElementById("card-story-text");
        var nextEl = document.getElementById("card-story-next");
        var cardSprite = document.getElementById("card-story-sprite");
        var cardImg = document.getElementById("card-story-card-img");
        if (!overlay) return;
        if (cardImg && detail && detail.id) {
            var cardsDir = ALICE_CONSTANTS.PATHS.CARDS_IMAGES || "assets/cards/";
            cardImg.src = (cardsDir + detail.id + ".webp").replace(/\/+/g, "/");
            cardImg.alt = detail.name || detail.id;
            cardImg.style.display = "";
        } else if (cardImg) {
            cardImg.src = "";
            cardImg.style.display = "none";
        }
        if (cardSprite && typeof CharacterFavor !== "undefined") CharacterFavor.showCharacter(cardSprite, "hana");
        overlay.classList.remove("hidden");
        if (nameEl) nameEl.textContent = "Hana";
        if (textEl) textEl.textContent = detail.fixedStory || "";
        if (nextEl) nextEl.textContent = "点击继续";
        return new Promise(function (resolve) {
            overlay.onclick = function () {
                overlay.classList.add("hidden");
                resolve();
            };
        });
    },

    renderQuiz() {
        const questions = Game.getQuestions();
        const idx = Game.answers.length;
        if (idx >= ALICE_CONSTANTS.BALANCE.QUIZ_COUNT) {
            App.finishQuiz();
            return;
        }
        const q = questions[idx];
        const container = document.getElementById("quiz-container");
        if (!container) return;
        const maxLen = ALICE_CONSTANTS.BALANCE.ANSWER_MAX_LEN || 30;
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
        const inputEl = document.getElementById("quiz-answer-input");
        const countEl = document.getElementById("quiz-char-count");
        const submitBtn = document.getElementById("quiz-submit-btn");
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
            submitBtn.onclick = () => {
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
                this.renderQuiz();
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

    /** 在 Alice 终局独立 section 中显示结局气泡（与 Hana 庭院分离） */
    showFateInSection(fateText) {
        var waitEl = document.getElementById("alice-ending-wait");
        var bubbleWrap = document.getElementById("alice-ending-bubble-wrap");
        var contentEl = document.getElementById("alice-ending-content");
        var downloadBtn = document.getElementById("alice-ending-download");
        var closeBtn = document.getElementById("alice-ending-close");
        if (waitEl) waitEl.classList.add("hidden");
        if (bubbleWrap) bubbleWrap.classList.remove("hidden");
        if (contentEl) contentEl.textContent = (fateText && String(fateText).trim()) ? fateText : "（终局文本尚未生成。）";
        if (downloadBtn) downloadBtn.onclick = function() { Game.downloadEnding(fateText || "", Game.currentDetail && Game.currentDetail.name); };
        if (closeBtn) closeBtn.onclick = function() { App.navigateTo("MAP"); };
    },

    /** 进入 Alice 终局 section 时显示等待状态、隐藏气泡 */
    showAliceEndingWait() {
        var waitEl = document.getElementById("alice-ending-wait");
        var bubbleWrap = document.getElementById("alice-ending-bubble-wrap");
        if (waitEl) waitEl.classList.remove("hidden");
        if (bubbleWrap) bubbleWrap.classList.add("hidden");
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
            await UI.showCardStory(detail);
            Game.currentDetail = detail;
            Game.saveProgress();
            self.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
            UI.renderQuiz();
        } catch (e) {
            self.hideLoading();
            alert(e.message || "抽卡失败");
        }
    }, function () {});
};

App.finishQuiz = async function() {
    this.showScene(ALICE_CONSTANTS.SCENES.ALICE_ENDING);
    this.setMainSpriteChar("alice");
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
