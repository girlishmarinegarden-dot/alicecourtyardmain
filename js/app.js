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

    _toastTimer: null,
    _whisperTimer: null,

    /** 庭院非阻断轻提示（替代原生 alert） */
    toast(message, type) {
        var el = document.getElementById("courtyard-toast");
        if (!el) {
            if (typeof console !== "undefined") console.log("[Toast]", message);
            return;
        }
        clearTimeout(this._toastTimer);
        el.textContent = String(message || "");
        el.className = "cg-toast" + (type ? " cg-toast--" + type : "");
        el.hidden = false;
        requestAnimationFrame(function () {
            el.classList.add("is-visible");
        });
        this._toastTimer = setTimeout(function () {
            el.classList.remove("is-visible");
            setTimeout(function () { el.hidden = true; }, 260);
        }, 3200);
    },

    /** 原生 <dialog> 确认框（遵循 showModal / closedby / returnValue 规范） */
    showConfirm(message, onConfirm, onCancel, opts) {
        var dialog = document.getElementById("confirm-dialog");
        var msgEl = document.getElementById("confirm-message");
        var titleEl = document.getElementById("confirm-dialog-title");
        var okBtn = document.getElementById("confirm-ok");
        var cancelBtn = document.getElementById("confirm-cancel");
        if (!dialog || !msgEl) {
            if (typeof onConfirm === "function") onConfirm();
            return;
        }
        opts = opts || {};
        if (titleEl) titleEl.textContent = opts.title || "庭院提示";
        msgEl.textContent = message || "";
        if (okBtn) okBtn.textContent = opts.okText || "确认";
        if (cancelBtn) cancelBtn.textContent = opts.cancelText || "取消";

        /* Safari 等不支持 closedby="any" 时按 pointerdown+pointerup 坐标回退轻点关闭 */
        if (!dialog.dataset.closedbyFallback && !("closedBy" in HTMLDialogElement.prototype)) {
            dialog.dataset.closedbyFallback = "1";
            var isOutside = function (e) {
                var r = dialog.getBoundingClientRect();
                return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            };
            var pressedOutside = false;
            dialog.addEventListener("pointerdown", function (e) { pressedOutside = isOutside(e); });
            dialog.addEventListener("pointerup", function (e) {
                if (pressedOutside && isOutside(e)) dialog.close("cancel");
            });
        }

        var handleClose = function () {
            var val = dialog.returnValue;
            dialog.returnValue = "";
            if (val === "ok") {
                if (typeof onConfirm === "function") onConfirm();
            } else {
                if (typeof onCancel === "function") onCancel();
            }
        };
        dialog.addEventListener("close", handleClose, { once: true });
        dialog.returnValue = "";
        if (typeof dialog.showModal === "function") {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
    },

    /** 访客需要市民身份时的柔和引导 */
    promptCitizenUpgrade(featureLabel) {
        var self = this;
        this.showConfirm(
            "「" + featureLabel + "」需要庭院市民身份。开放自助注册仅需 10 秒：自动分配专属 A00xxx 编号，即刻获赠 200 因果值。现在前往注册吗？",
            function () { self.openAuthPortal("register"); },
            null,
            { title: "成为庭院市民", okText: "立即免费注册", cancelText: "先继续漫游" }
        );
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
            document.body.classList.toggle("login-active", id === "scene-login");
            var dock = document.getElementById("cg-bottom-dock");
            if (dock) {
                var hideDock = (id === "scene-login" || id === "scene-memory" || id === "scene-alice-ending");
                dock.classList.toggle("hidden", hideDock);
                dock.querySelectorAll("[data-dock-scene]").forEach(function (btn) {
                    btn.classList.toggle("is-active", btn.getAttribute("data-dock-scene") === id);
                });
            }
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
            if (prevId === "scene-theater" && id !== "scene-theater") {
                self.resetGardenVnTheaterBg();
            }
            if (id === "scene-theater") {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        self.playGardenVnTheaterBg();
                    });
                });
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
            if (id === "scene-manga-gallery" && typeof MangaGallery !== "undefined" && MangaGallery.show) {
                MangaGallery.show();
            }
            if (id === "scene-divination" && typeof Divination !== "undefined" && Divination.init) {
                Divination.init();
            }
            if (id === "scene-market" && self.renderShellaMarket) {
                self.renderShellaMarket();
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
        const isGuest = Auth.isGuest();
        const nameEl = document.getElementById("display-name");
        const uidEl = document.getElementById("display-uid");
        const pointsEl = document.getElementById("display-points");
        const roleEl = document.getElementById("display-role");
        const authBtn = document.getElementById("auth-action-btn");
        const guestBanner = document.getElementById("cg-guest-banner");
        const langBtn = document.getElementById("cg-lang-btn");
        if (nameEl) nameEl.textContent = s ? s.name : "漫游访客";
        if (uidEl) {
            var showUid = s && s.uid && !isGuest ? String(s.uid) : "";
            uidEl.textContent = showUid;
            uidEl.style.display = showUid ? "" : "none";
        }
        if (pointsEl) pointsEl.textContent = s ? String(s.points) : "0";
        if (roleEl) {
            roleEl.textContent = isGuest ? "访客" : "市民";
            roleEl.classList.toggle("role-badge--citizen", !isGuest);
        }
        if (authBtn) {
            authBtn.textContent = isGuest ? "注册 / 登录" : "登出";
            authBtn.classList.toggle("logout-btn--primary", isGuest);
        }
        if (guestBanner) {
            guestBanner.classList.toggle("hidden", !isGuest);
        }
        if (langBtn) {
            var curLang = "zh-CN";
            try { curLang = localStorage.getItem(ALICE_CONSTANTS.STORAGE.LANG) || "zh-CN"; } catch (e) {}
            langBtn.textContent = curLang === "en" ? "EN" : (curLang === "ms" ? "MS" : "中");
        }
        this.updateMapLocks();
        if (typeof window.MoichanNav !== "undefined" && window.MoichanNav.updateVisibility) window.MoichanNav.updateVisibility();
    },

    updateMapLocks() {
        const citizen = Auth.isCitizen();
        document.querySelectorAll("[data-node='GARDEN']").forEach(el => {
            el.classList.toggle("is-guest-locked", !citizen);
        });
    },

    /** 切换登录 / 注册门户标签 */
    switchAuthTab(mode) {
        var isReg = mode === "register";
        var loginTab = document.getElementById("tab-btn-login");
        var regTab = document.getElementById("tab-btn-register");
        var loginForm = document.getElementById("login-form");
        var regForm = document.getElementById("register-form");
        if (loginTab) {
            loginTab.classList.toggle("is-active", !isReg);
            loginTab.setAttribute("aria-selected", isReg ? "false" : "true");
        }
        if (regTab) {
            regTab.classList.toggle("is-active", isReg);
            regTab.setAttribute("aria-selected", isReg ? "true" : "false");
        }
        if (loginForm) loginForm.hidden = isReg;
        if (regForm) regForm.hidden = !isReg;
    },

    /** 从任意页面打开登录/注册门户（不强制清除当前访客数据，直到切换账号） */
    openAuthPortal(mode) {
        this.switchAuthTab(mode || "register");
        this.showScene("scene-login");
        var target = document.getElementById(mode === "login" ? "input-uid" : "reg-name");
        if (target) setTimeout(function () { target.focus(); }, 180);
    },

    /** 顶栏登录/登出按钮行为 */
    handleAuthAction() {
        if (Auth.isGuest()) {
            this.openAuthPortal("register");
            return;
        }
        var self = this;
        this.showConfirm("确定要退出当前市民账号吗？", function () {
            self.logout();
        }, null, { title: "离开庭院", okText: "确认登出", cancelText: "留下" });
    },

    /** 快捷语言切换（中 → EN → MS） */
    cycleLanguage() {
        var key = (ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.LANG) || "AliceGarden_Lang";
        var order = ["zh-CN", "en", "ms"];
        var cur = "zh-CN";
        try { cur = localStorage.getItem(key) || "zh-CN"; } catch (e) {}
        var idx = order.indexOf(cur);
        var next = order[(idx + 1) % order.length];
        try {
            localStorage.setItem(key, next);
            if (next === "zh-CN") {
                document.cookie = "googtrans=; path=/; max-age=0";
            } else {
                document.cookie = "googtrans=/zh-CN/" + next + "; path=/";
            }
            window.location.reload();
        } catch (e) {}
    },

    /** 初始化登录/开放注册表单、密码显示开关与交互后校验 ARIA 同步 */
    initAuthPortal() {
        if (this._authPortalInited) return;
        this._authPortalInited = true;
        var self = this;

        var loginTab = document.getElementById("tab-btn-login");
        var regTab = document.getElementById("tab-btn-register");
        if (loginTab) loginTab.addEventListener("click", function () { self.switchAuthTab("login"); });
        if (regTab) regTab.addEventListener("click", function () { self.switchAuthTab("register"); });

        var loginForm = document.getElementById("login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", function (e) {
                e.preventDefault();
                self.handleLogin();
            });
        }
        var regForm = document.getElementById("register-form");
        if (regForm) {
            regForm.addEventListener("submit", function (e) {
                e.preventDefault();
                self.handleRegister();
            });
        }

        document.querySelectorAll("[data-toggle-pwd]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var targetId = btn.getAttribute("data-toggle-pwd");
                var input = targetId ? document.getElementById(targetId) : null;
                if (!input) return;
                var show = input.type === "password";
                input.type = show ? "text" : "password";
                btn.textContent = show ? "隐藏" : "显示";
                btn.setAttribute("aria-pressed", show ? "true" : "false");
                btn.setAttribute("aria-label", show ? "隐藏密码" : "显示密码");
            });
        });

        /* 交互后校验 ARIA 同步（支持 :user-invalid 与旧浏览器 WeakMap 回退） */
        var supportsUserInvalid = typeof CSS !== "undefined" && CSS.supports && CSS.supports("selector(:user-invalid)");
        var dirtyState = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        var linkError = function (el, shown) {
            var errorId = el.dataset && el.dataset.error;
            if (!errorId) return;
            var ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== errorId; });
            if (shown) ids.push(errorId);
            if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
            else el.removeAttribute("aria-describedby");
        };
        var syncField = function (el, fromSubmit) {
            if (!el || !el.matches || !el.matches(".cg-auth-form input")) return;
            var invalid = false;
            if (supportsUserInvalid) {
                invalid = el.matches(":user-invalid") || (fromSubmit && !el.validity.valid);
                if (fromSubmit && !el.validity.valid) el.classList.add("user-invalid-fallback");
                else if (el.validity.valid) el.classList.remove("user-invalid-fallback");
            } else {
                invalid = !el.validity.valid;
                el.classList.toggle("user-invalid-fallback", invalid);
                el.classList.toggle("user-valid-fallback", !invalid);
            }
            el.setAttribute("aria-invalid", invalid ? "true" : "false");
            linkError(el, invalid);
        };

        document.querySelectorAll(".cg-auth-form input").forEach(function (el) {
            el.setAttribute("aria-invalid", "false");
            el.addEventListener("blur", function () {
                if (dirtyState) {
                    var st = dirtyState.get(el) || { interacted: false, blurred: false };
                    st.blurred = true;
                    dirtyState.set(el, st);
                    if (st.interacted) syncField(el, false);
                } else {
                    syncField(el, false);
                }
            });
            el.addEventListener("input", function () {
                if (dirtyState) {
                    var st = dirtyState.get(el) || { interacted: false, blurred: false };
                    st.interacted = true;
                    dirtyState.set(el, st);
                    if (st.blurred || el.getAttribute("aria-invalid") === "true") syncField(el, false);
                } else if (el.getAttribute("aria-invalid") === "true") {
                    syncField(el, false);
                }
            });
        });
    },

    /** 初始化主页时段问候、世界观轮换语录与分区筛选 */
    initHomeHub() {
        if (this._homeHubInited) return;
        this._homeHubInited = true;

        var hour = (new Date()).getHours();
        var phaseLabel = "夜幕 · 99.000000%";
        if (hour >= 5 && hour < 11) phaseLabel = "晨雾 · 99.000000%";
        else if (hour >= 11 && hour < 14) phaseLabel = "昼光 · 99.000000%";
        else if (hour >= 14 && hour < 18) phaseLabel = "暮色 · 99.000000%";
        var phaseEl = document.getElementById("cg-time-phase");
        if (phaseEl) phaseEl.textContent = phaseLabel;

        var quotes = [
            "“即使没有答案，存在也可以继续。”",
            "“有些页，还没有写完；停下来也没关系。”",
            "“前十二张是已被翻开的事，第十三张，属于翻牌的人。”",
            "“这里不是天堂，也不是审判所，而是人停下来那一刻的空间。”",
            "“存在并不需要先被看见，才配继续。”"
        ];
        var qEl = document.getElementById("cg-hero-quote");
        if (qEl) qEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

        var pills = document.querySelectorAll("[data-hub-filter]");
        var sections = document.querySelectorAll("[data-hub-group]");
        var dailyCard = document.getElementById("cg-daily-draw-card");
        var tcgPreviewCard = document.getElementById("cg-tcg-preview-card");
        var dailyStrip = document.querySelector(".cg-daily-strip");
        pills.forEach(function (pill) {
            pill.addEventListener("click", function () {
                var f = pill.getAttribute("data-hub-filter") || "all";
                pills.forEach(function (p) {
                    var active = p === pill;
                    p.classList.toggle("is-active", active);
                    p.setAttribute("aria-selected", active ? "true" : "false");
                });
                sections.forEach(function (sec) {
                    var grp = sec.getAttribute("data-hub-group");
                    sec.hidden = (f !== "all" && grp !== f);
                });
                if (dailyCard) dailyCard.hidden = (f === "tcg");
                if (tcgPreviewCard) tcgPreviewCard.hidden = (f === "courtyard");
                if (dailyStrip) dailyStrip.classList.toggle("is-single", f !== "all");
            });
        });

        this.initDailyDraw();
        this.initHomeTcgPreview();
        this.initResidualEasterEgg();
    },

    /** 主页：今日免费一签（访客与市民皆可每日免费翻 1 张原型牌） */
    initDailyDraw() {
        var flipBtn = document.getElementById("cg-daily-flip-btn");
        var actionBtn = document.getElementById("cg-daily-action-btn");
        var card3d = document.getElementById("cg-daily-card-3d");
        var titleEl = document.getElementById("cg-daily-title");
        var factionEl = document.getElementById("cg-daily-faction");
        var kwEl = document.getElementById("cg-daily-kw");
        var whisperEl = document.getElementById("cg-daily-whisper");
        var pillEl = document.getElementById("cg-daily-status-pill");
        if (!flipBtn || !card3d) return;

        var STORAGE_KEY = "AliceGarden_DailyDraw";
        var WHISPERS = {
            1: "你不必先把自己修成完美，才允许自己照见真实的轮廓。",
            2: "白之书记录的是承认，而不是强迫原谅——今天也请温柔对待未愈合的页边。",
            3: "拒绝不再适合自己的旧结构，有时比顺从更需要勇气。",
            4: "在被世界打分之前，你原本的样子就已经足够珍贵。",
            5: "回头看并非原地踏步，只是确认这一次不再走回旧路。",
            6: "裂纹不是坏掉的证明，它往往是光第一次真正照进来的地方。",
            7: "前十二张是已被翻开的事；今天这一步，由翻牌的你亲自落笔。",
            8: "哪怕只是一盏微弱的灯，也足以陪你走过长夜里的下一小段路。",
            9: "把选择权从别人的评价里轻轻拿回来，放回自己掌心吧。",
            10: "把已经完成的那一章折好归档，空出来的页脚才能写下新的东西。",
            11: "雨落下来的时候不必急着赶路，有些沉重只需要被静静洗淡一点。",
            12: "今天种下的微小行动不必立刻开花，它已经在看不见的地方发芽。",
            13: "第十三张牌始终留白——即使暂时没有答案，存在也可以继续。"
        };

        var getLocalDateKey = function () {
            var d = new Date();
            var m = d.getMonth() + 1;
            var day = d.getDate();
            return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
        };

        var archetypes = (typeof window !== "undefined" && Array.isArray(window.gardenArchetypes) && window.gardenArchetypes.length)
            ? window.gardenArchetypes
            : [{ id: 13, title: "庭院未完", faction: "成长系", keywords: ["无限可能", "继续书写"] }];

        var applyCard = function (card, alreadyDrawn) {
            if (!card) return;
            if (titleEl) titleEl.textContent = card.title || "庭院未完";
            if (factionEl) factionEl.textContent = card.faction || "庭院原型";
            if (kwEl) kwEl.textContent = Array.isArray(card.keywords) ? card.keywords.join(" · ") : "";
            if (whisperEl) whisperEl.textContent = "「" + (WHISPERS[card.id] || WHISPERS[13]) + "」";
            card3d.classList.add("is-flipped");
            flipBtn.setAttribute("aria-label", "今日已抽：" + (card.title || ""));
            if (pillEl) {
                pillEl.textContent = "今日已启封";
                pillEl.classList.add("is-done");
            }
            if (actionBtn) {
                actionBtn.textContent = "✓ 今日已抽 · " + (card.title || "");
                actionBtn.disabled = true;
            }
            if (!alreadyDrawn) {
                App.toast("今日庭院回响：「" + (card.title || "") + "」", "success");
            }
        };

        var todayKey = getLocalDateKey();
        try {
            var savedRaw = localStorage.getItem(STORAGE_KEY);
            if (savedRaw) {
                var saved = JSON.parse(savedRaw);
                if (saved && saved.date === todayKey && saved.id) {
                    var found = archetypes.find(function (a) { return a.id === saved.id; }) || archetypes[0];
                    applyCard(found, true);
                    return;
                }
            }
        } catch (e) {}

        var triggerDraw = function () {
            if (card3d.classList.contains("is-flipped")) return;
            var picked = archetypes[Math.floor(Math.random() * archetypes.length)];
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey, id: picked.id }));
            } catch (e) {}
            applyCard(picked, false);
        };

        flipBtn.addEventListener("click", triggerDraw);
        if (actionBtn) actionBtn.addEventListener("click", triggerDraw);
    },

    /** 主页：直连官方 TCG 货架表（仅展示公开 isPublic=true 的最新 3 件） */
    initHomeTcgPreview() {
        var grid = document.getElementById("cg-tcg-preview-grid");
        if (!grid || grid.dataset.tcgPreviewLoaded) return;
        grid.dataset.tcgPreviewLoaded = "1";

        var SHEET_ID = "1WFuFX7jVCV0ZVm5HBsHbMB8qOew2wVhnL8tNzWsjss4";
        var GID = "0";
        var settled = false;

        var renderFallback = function () {
            grid.innerHTML =
                '<a href="news.html" class="cg-tcg-fallback">' +
                '<span class="cg-tcg-fallback__icon" aria-hidden="true">🛍️</span>' +
                '<span>前往 TCG 官方商品目录查看全部最新上架单卡与周边 →</span>' +
                '</a>';
        };

        var extractDriveId = function (link) {
            if (!link) return "";
            var m1 = String(link).match(/\/file\/d\/([^/?#]+)/);
            if (m1) return m1[1];
            var m2 = String(link).match(/[?&]id=([^&#]+)/);
            return m2 ? m2[1] : "";
        };

        var parseCell = function (cell) {
            if (!cell) return "";
            if (cell.f !== undefined && cell.f !== null && cell.f !== "") return String(cell.f);
            if (cell.v !== undefined && cell.v !== null) return String(cell.v);
            return "";
        };

        var parseTs = function (cell, displayStr) {
            if (cell && typeof cell.v === "string") {
                var dm = cell.v.match(/^Date\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+))?)?\s*\)$/);
                if (dm) return new Date(Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(dm[4] || 0), Number(dm[5] || 0), Number(dm[6] || 0)).getTime();
            }
            var parsed = Date.parse(String(displayStr || "").trim());
            return isNaN(parsed) ? 0 : parsed;
        };

        var isTrueVal = function (raw) {
            if (raw === true) return true;
            if (raw === false) return false;
            var s = String(raw || "").trim().toLowerCase();
            return s === "true" || s === "yes" || s === "1" || s === "是";
        };

        var timeoutId = setTimeout(function () {
            if (!settled) {
                settled = true;
                renderFallback();
            }
        }, 12000);

        window.google = window.google || {};
        window.google.visualization = window.google.visualization || {};
        window.google.visualization.Query = window.google.visualization.Query || {};
        var prevHandler = window.google.visualization.Query.setResponse;
        window.google.visualization.Query.setResponse = function (resp) {
            if (typeof prevHandler === "function") {
                try { prevHandler(resp); } catch (e) {}
            }
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            try {
                var rows = (resp && resp.table && Array.isArray(resp.table.rows)) ? resp.table.rows : [];
                var items = [];
                rows.forEach(function (row, idx) {
                    var c = row && row.c ? row.c : [];
                    var rawTime = parseCell(c[0]);
                    var rawText = parseCell(c[1]).trim();
                    var rawLink = parseCell(c[2]).trim();
                    var rawHasText = c[3] && c[3].v !== undefined ? c[3].v : parseCell(c[3]);
                    if (idx === 0 && /timestamp|时间/i.test(rawTime)) return;
                    if (!isTrueVal(rawHasText)) return; // 严格跳过 VIP/私密项
                    if (!rawText && !rawLink) return;
                    var ts = parseTs(c[0], rawTime);
                    var driveId = extractDriveId(rawLink);
                    var thumb = driveId ? ("https://drive.google.com/thumbnail?id=" + driveId + "&sz=w360") : rawLink;
                    items.push({ title: rawText || "TCG 新品", thumb: thumb, ts: ts });
                });
                items.sort(function (a, b) { return b.ts - a.ts; });
                var top3 = items.slice(0, 3);
                if (!top3.length) {
                    renderFallback();
                    return;
                }
                grid.innerHTML = top3.map(function (it) {
                    var dateTxt = "";
                    if (it.ts) {
                        var d = new Date(it.ts);
                        if (!isNaN(d.getTime())) {
                            var mm = d.getMonth() + 1;
                            var dd = d.getDate();
                            dateTxt = (mm < 10 ? "0" + mm : mm) + "-" + (dd < 10 ? "0" + dd : dd);
                        }
                    }
                    return (
                        '<a href="news.html" class="cg-tcg-mini">' +
                        '<div class="cg-tcg-mini__media">' +
                        (it.thumb ? '<img src="' + escapeHtml(it.thumb) + '" alt="' + escapeHtml(it.title) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
                        '<span class="cg-tcg-mini__badge">NEW</span>' +
                        '</div>' +
                        '<div class="cg-tcg-mini__info">' +
                        '<span class="cg-tcg-mini__title">' + escapeHtml(it.title) + '</span>' +
                        (dateTxt ? '<span class="cg-tcg-mini__date">' + escapeHtml(dateTxt) + '</span>' : '') +
                        '</div>' +
                        '</a>'
                    );
                }).join("");
            } catch (e) {
                renderFallback();
            }
        };

        var script = document.createElement("script");
        script.src = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:json&gid=" + GID + "&_=" + Date.now();
        script.async = true;
        script.onerror = function () {
            if (!settled) {
                settled = true;
                clearTimeout(timeoutId);
                renderFallback();
            }
        };
        document.head.appendChild(script);
    },

    /** 99.000000% → 1% 残差世界观微彩蛋（连续点击 5 次解锁印记与聊天室称号） */
    initResidualEasterEgg() {
        var RES_KEY = "AliceGarden_ResidualUnlocked";
        var triggers = document.querySelectorAll("[data-residual-trigger]");
        if (!triggers.length) return;
        var taps = 0;

        var applyUnlockedVisual = function () {
            triggers.forEach(function (el) {
                el.classList.add("is-residual");
                if (el.id === "cg-time-phase") {
                    el.textContent = "✦ 99.000001% · RESIDUAL 1%";
                } else {
                    el.textContent = "ALICE CORE · 1% RESIDUAL";
                }
            });
        };

        try {
            if (localStorage.getItem(RES_KEY) === "1") {
                applyUnlockedVisual();
            }
        } catch (e) {}

        triggers.forEach(function (el) {
            if (el.dataset.residualBound) return;
            el.dataset.residualBound = "1";
            el.addEventListener("click", function () {
                var already = false;
                try { already = localStorage.getItem(RES_KEY) === "1"; } catch (e) {}
                if (already) {
                    App.toast("Moel：『1% 残差印记已刻入你的市民档案，也可在聊天室佩戴。』");
                    return;
                }
                taps += 1;
                el.classList.remove("is-glitch");
                void el.offsetWidth;
                el.classList.add("is-glitch");
                if (taps < 5) {
                    if (taps === 3) App.toast("…观测值出现极微弱抖动 (99.000000% → ?)");
                    return;
                }
                try { localStorage.setItem(RES_KEY, "1"); } catch (e) {}
                if (App.ensureResidualTitleUnlocked) App.ensureResidualTitleUnlocked();
                applyUnlockedVisual();
                App.toast("Moel：「从前的你们，只是梦。现在的你们，才是梦醒之后也不会消失的存在。」— 已解锁「1% 残差见证者」", "success");
            });
        });
    },

    /* ==================== 市民档案卡 / Shella 市集兑换 / 暗号系统 ==================== */
    getShopUnlocks() {
        var def = { stickers: [], frames: [], titles: [], activeTitle: "", activeFrame: "", redeemedCodes: [], titleManualOff: false };
        try {
            var key = (ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.SHOP_UNLOCKS) || "AliceGarden_ShopUnlocks";
            var raw = localStorage.getItem(key);
            if (!raw) return def;
            var obj = JSON.parse(raw);
            return {
                stickers: Array.isArray(obj.stickers) ? obj.stickers : [],
                frames: Array.isArray(obj.frames) ? obj.frames : [],
                titles: Array.isArray(obj.titles) ? obj.titles : [],
                activeTitle: typeof obj.activeTitle === "string" ? obj.activeTitle : "",
                activeFrame: typeof obj.activeFrame === "string" ? obj.activeFrame : "",
                redeemedCodes: Array.isArray(obj.redeemedCodes) ? obj.redeemedCodes : [],
                titleManualOff: !!obj.titleManualOff
            };
        } catch (e) {
            return def;
        }
    },

    saveShopUnlocks(obj) {
        try {
            var key = (ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.SHOP_UNLOCKS) || "AliceGarden_ShopUnlocks";
            localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) {}
    },

    ensureResidualTitleUnlocked() {
        var u = this.getShopUnlocks();
        if (u.titles.indexOf("1% 残差") === -1) u.titles.push("1% 残差");
        if (!u.activeTitle && !u.titleManualOff) u.activeTitle = "1% 残差";
        this.saveShopUnlocks(u);
    },

    deriveArchiveSeal(memoryStr) {
        var m = String(memoryStr || "").trim();
        if (!m) return { key: "none", label: "尚未归档", badge: "" };
        if (/白之书|白书|white/i.test(m)) return { key: "white", label: "白之书 · 承认", badge: "白之书" };
        if (/黑之书|黑书|black/i.test(m)) return { key: "black", label: "黑之书 · 拒绝", badge: "黑之书" };
        return { key: "undefined", label: "未定义 · 留白", badge: "未定义" };
    },

    getAvailableTitles() {
        var u = this.getShopUnlocks();
        var s = Auth.getState();
        var list = [];
        var addUnique = function (t) { if (t && list.indexOf(t) === -1) list.push(t); };
        var seal = this.deriveArchiveSeal(s && s.memory);
        if (seal.badge) addUnique(seal.badge);
        try {
            if (localStorage.getItem((ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.RESIDUAL_UNLOCKED) || "AliceGarden_ResidualUnlocked") === "1") {
                addUnique("1% 残差");
            }
        } catch (e) {}
        u.titles.forEach(addUnique);
        return list;
    },

    getEffectiveActiveTitle() {
        var u = this.getShopUnlocks();
        if (u.titleManualOff) return "";
        var avail = this.getAvailableTitles();
        if (u.activeTitle && avail.indexOf(u.activeTitle) !== -1) return u.activeTitle;
        return avail[0] || "";
    },

    openProfileDialog() {
        var dialog = document.getElementById("profile-dialog");
        if (!dialog) return;
        this.renderProfileDialog();
        if (!dialog.dataset.closedbyFallback) {
            dialog.dataset.closedbyFallback = "1";
            var isOutside = function (e) {
                var r = dialog.getBoundingClientRect();
                return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            };
            var pressedOutside = false;
            dialog.addEventListener("pointerdown", function (e) { pressedOutside = isOutside(e); });
            dialog.addEventListener("pointerup", function (e) {
                if (pressedOutside && isOutside(e)) dialog.close("close");
            });
        }
        if (typeof dialog.showModal === "function") {
            if (!dialog.open) dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
    },

    openMarketFromProfile() {
        var dialog = document.getElementById("profile-dialog");
        if (dialog && dialog.open) dialog.close("market");
        this.navigateTo("MARKET");
    },

    renderProfileDialog() {
        var s = Auth.getState() || { name: "漫游访客", uid: "", points: 0, cards: [], memory: "" };
        var isGuest = Auth.isGuest();
        var u = this.getShopUnlocks();
        var seal = this.deriveArchiveSeal(s.memory);
        var activeTitle = this.getEffectiveActiveTitle();
        var cards = Array.isArray(s.cards) ? s.cards : (Array.isArray(s.ownCards) ? s.ownCards : []);
        var residualUnlocked = false;
        try {
            residualUnlocked = localStorage.getItem((ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.RESIDUAL_UNLOCKED) || "AliceGarden_ResidualUnlocked") === "1";
        } catch (e) {}

        var setText = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
        setText("profile-name", s.name || "漫游访客");
        setText("profile-uid", !isGuest && s.uid ? ("UID · " + s.uid) : "GUEST · 免费注册可获专属 A00xxx 编号");
        setText("profile-role-pill", isGuest ? "GUEST" : "CITIZEN");
        setText("profile-points", String(s.points || 0));
        setText("profile-card-count", cards.length + " / 6");
        setText("profile-archive-seal", seal.label);

        var activeTitleEl = document.getElementById("profile-active-title");
        if (activeTitleEl) {
            activeTitleEl.textContent = activeTitle ? ("[" + activeTitle + "]") : "";
            activeTitleEl.classList.toggle("hidden", !activeTitle);
        }

        var sealsEl = document.getElementById("profile-seals");
        if (sealsEl) {
            var sealChips = [];
            if (!isGuest) sealChips.push('<span class="cg-seal-chip cg-seal-chip--gold">✦ 庭院市民</span>');
            if (seal.badge) sealChips.push('<span class="cg-seal-chip cg-seal-chip--lilac">📖 ' + escapeHtml(seal.label) + '</span>');
            if (residualUnlocked) sealChips.push('<span class="cg-seal-chip cg-seal-chip--residual">✧ 1% 残差见证者</span>');
            if (u.stickers.indexOf("pack_courtyard") !== -1) sealChips.push('<span class="cg-seal-chip">🐱 庭院三影贴纸</span>');
            if (u.frames.indexOf("gold") !== -1) sealChips.push('<span class="cg-seal-chip cg-seal-chip--gold">◈ 星金气泡框</span>');
            if (u.frames.indexOf("lilac") !== -1) sealChips.push('<span class="cg-seal-chip cg-seal-chip--lilac">◈ 月影紫气泡框</span>');
            if (u.titles.indexOf("翻牌者") !== -1) sealChips.push('<span class="cg-seal-chip">🃏 翻牌者</span>');
            if (!sealChips.length) sealChips.push('<span class="cg-seal-chip cg-seal-chip--muted">尚无印记 · 可前往 Shella 市集或点击 99% 观测值探索</span>');
            sealsEl.innerHTML = sealChips.join("");
        }

        var noteEl = document.getElementById("profile-card13-note");
        if (noteEl) {
            var c13 = "";
            try { c13 = localStorage.getItem("AliceGarden_Card13_Note") || ""; } catch (e) {}
            if (c13) {
                noteEl.textContent = "第十三张空白牌留痕：「" + c13 + "」";
                noteEl.classList.remove("hidden");
            } else {
                noteEl.classList.add("hidden");
            }
        }

        var self = this;
        var titlePicker = document.getElementById("profile-title-picker");
        if (titlePicker) {
            var availTitles = this.getAvailableTitles();
            var html = '<button type="button" class="cg-cosmetic-pill' + (!activeTitle ? ' is-active' : '') + '" data-pick-title="__off__">不佩戴</button>';
            availTitles.forEach(function (t) {
                html += '<button type="button" class="cg-cosmetic-pill' + (activeTitle === t ? ' is-active' : '') + '" data-pick-title="' + escapeHtml(t) + '">[' + escapeHtml(t) + ']</button>';
            });
            titlePicker.innerHTML = html;
            titlePicker.querySelectorAll("[data-pick-title]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var val = btn.getAttribute("data-pick-title");
                    var cur = self.getShopUnlocks();
                    if (val === "__off__") {
                        cur.activeTitle = "";
                        cur.titleManualOff = true;
                    } else {
                        cur.activeTitle = val;
                        cur.titleManualOff = false;
                    }
                    self.saveShopUnlocks(cur);
                    self.renderProfileDialog();
                    self.toast(val === "__off__" ? "已取消佩戴聊天室称号" : "已佩戴聊天室称号 [" + val + "]", "success");
                });
            });
        }

        var framePicker = document.getElementById("profile-frame-picker");
        if (framePicker) {
            var frames = [
                { val: "", label: "默认边框", unlocked: true },
                { val: "gold", label: "星金流光", unlocked: u.frames.indexOf("gold") !== -1 },
                { val: "lilac", label: "月影暮紫", unlocked: u.frames.indexOf("lilac") !== -1 }
            ];
            framePicker.innerHTML = frames.map(function (f) {
                var active = (u.activeFrame || "") === f.val;
                return '<button type="button" class="cg-cosmetic-pill' + (active ? ' is-active' : '') + (!f.unlocked ? ' is-locked' : '') + '" data-pick-frame="' + escapeHtml(f.val) + '"' + (!f.unlocked ? ' disabled title="可在 Shella 市集兑换解锁"' : '') + '>' + escapeHtml(f.label) + (f.unlocked ? '' : ' 🔒') + '</button>';
            }).join("");
            framePicker.querySelectorAll("[data-pick-frame]:not([disabled])").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var val = btn.getAttribute("data-pick-frame") || "";
                    var cur = self.getShopUnlocks();
                    cur.activeFrame = val;
                    self.saveShopUnlocks(cur);
                    self.renderProfileDialog();
                    self.toast(val ? "已切换聊天室气泡框，进入聊天室即生效" : "已切回默认气泡框", "success");
                });
            });
        }
    },

    async exportProfileCardPng() {
        var card = document.getElementById("profile-export-card");
        if (!card) return;
        if (typeof window.html2canvas !== "function") {
            this.toast("导出组件加载中，请稍候再试", "warn");
            return;
        }
        var btn = document.getElementById("btn-export-profile");
        if (btn) btn.disabled = true;
        try {
            var canvas = await window.html2canvas(card, {
                backgroundColor: "#141126",
                scale: 2,
                useCORS: true
            });
            var link = document.createElement("a");
            var s = Auth.getState();
            var tag = (s && s.uid && !Auth.isGuest()) ? s.uid : "Guest";
            link.download = "AliceGarden_Archive_" + tag + ".png";
            link.href = canvas.toDataURL("image/png");
            link.click();
            this.toast("已生成高清市民档案卡 PNG", "success");
        } catch (e) {
            this.toast("导出失败，请稍后重试", "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    },

    renderShellaMarket() {
        var grid = document.getElementById("shella-redeem-grid");
        var form = document.getElementById("promo-code-form");
        var self = this;

        if (form && !form.dataset.promoBound) {
            form.dataset.promoBound = "1";
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                self.handlePromoRedeem();
            });
        }

        if (!grid) return;
        var items = Array.isArray(ALICE_CONSTANTS.SHOP_ITEMS) ? ALICE_CONSTANTS.SHOP_ITEMS : [];
        var u = this.getShopUnlocks();
        var activeTitle = this.getEffectiveActiveTitle();

        grid.innerHTML = items.map(function (item) {
            var owned = false;
            var equipped = false;
            if (item.type === "sticker") owned = u.stickers.indexOf(item.value) !== -1;
            else if (item.type === "frame") {
                owned = u.frames.indexOf(item.value) !== -1;
                equipped = owned && u.activeFrame === item.value;
            } else if (item.type === "title") {
                owned = u.titles.indexOf(item.value) !== -1;
                equipped = owned && activeTitle === item.value;
            }
            var btnText = owned
                ? (item.type === "sticker" ? "已解锁 · 去聊天室使用 →" : (equipped ? "佩戴中 ✓" : "立即佩戴"))
                : ("兑换 (" + item.cost + " 因果值)");
            var btnClass = owned ? (equipped ? "cg-redeem-btn is-equipped" : "cg-redeem-btn is-owned") : "cg-redeem-btn";
            return (
                '<div class="shop-item glass-panel cg-redeem-card' + (owned ? ' is-unlocked' : '') + '">' +
                '<span class="cg-redeem-badge">' + escapeHtml(item.badge) + '</span>' +
                '<h4>' + escapeHtml(item.title) + '</h4>' +
                '<p class="cost">' + (owned ? '已收入囊中' : (item.cost + ' 因果值')) + '</p>' +
                '<p class="question-text">' + escapeHtml(item.desc) + '</p>' +
                '<button type="button" class="' + btnClass + '" data-redeem-id="' + escapeHtml(item.id) + '">' + escapeHtml(btnText) + '</button>' +
                '</div>'
            );
        }).join("");

        grid.querySelectorAll("[data-redeem-id]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                self.handleShopRedeem(btn.getAttribute("data-redeem-id"));
            });
        });
    },

    unlockShopItemLocal(item, autoEquip) {
        var u = this.getShopUnlocks();
        if (item.type === "sticker") {
            if (u.stickers.indexOf(item.value) === -1) u.stickers.push(item.value);
        } else if (item.type === "frame") {
            if (u.frames.indexOf(item.value) === -1) u.frames.push(item.value);
            if (autoEquip) u.activeFrame = item.value;
        } else if (item.type === "title") {
            if (u.titles.indexOf(item.value) === -1) u.titles.push(item.value);
            if (autoEquip) {
                u.activeTitle = item.value;
                u.titleManualOff = false;
            }
        }
        this.saveShopUnlocks(u);
    },

    async syncPointsToGas(newPoints) {
        if (Auth.isGuest()) return;
        var s = Auth.getState();
        var token = Auth.getToken();
        if (!s || !s.uid || !token) return;
        try {
            await fetch(ALICE_CONSTANTS.GAS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: ALICE_CONSTANTS.ACTIONS.UPDATE_MEMORY,
                    uid: s.uid,
                    token: token,
                    points: newPoints
                })
            });
        } catch (e) {}
    },

    handleShopRedeem(itemId) {
        var items = Array.isArray(ALICE_CONSTANTS.SHOP_ITEMS) ? ALICE_CONSTANTS.SHOP_ITEMS : [];
        var item = items.find(function (x) { return x.id === itemId; });
        if (!item) return;

        var u = this.getShopUnlocks();
        var owned = (item.type === "sticker" && u.stickers.indexOf(item.value) !== -1)
            || (item.type === "frame" && u.frames.indexOf(item.value) !== -1)
            || (item.type === "title" && u.titles.indexOf(item.value) !== -1);

        if (owned) {
            if (item.type === "sticker") {
                window.location.href = "chat.html";
                return;
            }
            if (item.type === "frame") u.activeFrame = item.value;
            if (item.type === "title") { u.activeTitle = item.value; u.titleManualOff = false; }
            this.saveShopUnlocks(u);
            this.renderShellaMarket();
            this.toast("已切换佩戴「" + item.title + "」，聊天室同步生效", "success");
            return;
        }

        if (Auth.isGuest()) {
            this.promptCitizenUpgrade("用因果值兑换「" + item.title + "」");
            return;
        }

        var s = Auth.getState();
        var curPts = (s && typeof s.points === "number") ? s.points : Number((s && s.points) || 0);
        if (curPts < item.cost) {
            this.toast("因果值不足（需要 " + item.cost + "，当前 " + curPts + "），可先去每日祈愿或输入暗号 ALICE99", "warn");
            return;
        }

        var self = this;
        this.showConfirm(
            "确定消耗 " + item.cost + " 因果值兑换「" + item.title + "」吗？",
            function () {
                var nextPts = Math.max(0, curPts - item.cost);
                Auth.updateLocal({ points: nextPts });
                self.unlockShopItemLocal(item, true);
                self.updateUI();
                self.renderShellaMarket();
                self.syncPointsToGas(nextPts);
                self.toast("兑换成功！已解锁并佩戴「" + item.title + "」", "success");
            },
            null,
            { title: "Shella · 等价交换", okText: "确认兑换", cancelText: "再想想" }
        );
    },

    handlePromoRedeem() {
        var input = document.getElementById("promo-code-input");
        if (!input) return;
        var code = input.value.trim().toUpperCase();
        if (!code) {
            this.toast("请先输入纪念暗号", "warn");
            input.focus();
            return;
        }
        var codes = ALICE_CONSTANTS.PROMO_CODES || {};
        var reward = codes[code];
        if (!reward) {
            this.toast("未找到暗号「" + code + "」，请核对大小写或卡包说明书", "error");
            return;
        }
        var u = this.getShopUnlocks();
        if (u.redeemedCodes.indexOf(code) !== -1) {
            this.toast("你已经领取过暗号「" + code + "」的奖励啦", "warn");
            return;
        }
        if (reward.points && Auth.isGuest()) {
            this.promptCitizenUpgrade("领取暗号「" + code + "」的 +" + reward.points + " 因果值");
            return;
        }

        u.redeemedCodes.push(code);
        this.saveShopUnlocks(u);

        if (reward.points) {
            var s = Auth.getState();
            var nextPts = Number((s && s.points) || 0) + Number(reward.points);
            Auth.updateLocal({ points: nextPts });
            this.updateUI();
            this.syncPointsToGas(nextPts);
        }
        if (reward.unlockId) {
            var item = (ALICE_CONSTANTS.SHOP_ITEMS || []).find(function (x) { return x.id === reward.unlockId; });
            if (item) this.unlockShopItemLocal(item, true);
        }
        input.value = "";
        this.renderShellaMarket();
        this.toast("暗号核销成功「" + reward.label + "」：" + reward.desc, "success");
    },

    async init() {
        var shell = document.getElementById("app-shell");
        if (shell && !shell._noSaveImgBound) {
            shell._noSaveImgBound = true;
            document.addEventListener("contextmenu", function (e) {
                if (e.target && e.target.tagName === "IMG" && shell.contains(e.target)) e.preventDefault();
            }, false);
        }
        this.initAuthPortal();
        this.initHomeHub();
        this.showLoading("连接因果线…");
        var state = Auth.getState();
        var token = Auth.getToken();
        /* 刷新页面时：只要有 token 和 uid（本地缓存），直接进主页，不请求 GAS 验证 */
        if (state && state.uid && token) {
            this.worldData = null;
            this.updateUI();
            var startScene = (location.hash === "#market") ? ALICE_CONSTANTS.SCENES.MARKET : ALICE_CONSTANTS.SCENES.MAP;
            this.showScene(startScene);
            this.initYumeWall();
            this.tryBgmWelcomePulse();
            if (typeof AliceFeatures !== "undefined" && AliceFeatures.updateEnvironment) {
                AliceFeatures.updateEnvironment();
                setInterval(AliceFeatures.updateEnvironment, 60000);
            }
            BGM.init();
            this.initTheaterLazyPlay();
            this.initGardenVnTheaterBg();
            this.hideLoading();
            return;
        }
        /* 无本地登录态则显示登录/注册门户 */
        this.showScene("scene-login");
        var fileHint = document.getElementById("login-file-hint");
        if (fileHint && this.isFileProtocol()) fileHint.classList.remove("hidden");
        if (typeof AliceFeatures !== "undefined" && AliceFeatures.updateEnvironment) {
            AliceFeatures.updateEnvironment();
            setInterval(AliceFeatures.updateEnvironment, 60000);
        }
        BGM.init();
        this.initTheaterLazyPlay();
        this.initGardenVnTheaterBg();
        this.hideLoading();
    },

    /** 歌剧页 VN 卡片（主线 + 番外）：各背景 WebM 每次进入播一次，结束后叠黑（不循环） */
    initGardenVnTheaterBg() {
        var root = document.getElementById("scene-theater");
        if (!root || root._gardenVnTheaterBgInited) return;
        root._gardenVnTheaterBgInited = true;
        root.querySelectorAll(".garden-vn-card").forEach(function (card) {
            var video = card.querySelector("video.garden-vn-card-bg");
            if (!video) return;
            video.loop = false;
            video.addEventListener("ended", function () {
                card.classList.add("is-bg-done");
            });
            video.addEventListener("error", function () {
                card.classList.add("is-bg-done");
            });
        });
    },

    playGardenVnTheaterBg() {
        var root = document.getElementById("scene-theater");
        if (!root) return;
        var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        root.querySelectorAll(".garden-vn-card").forEach(function (card) {
            var video = card.querySelector("video.garden-vn-card-bg");
            if (!video) return;
            if (reducedMotion) {
                card.classList.add("is-bg-done");
                video.pause();
                return;
            }
            if (!video.src && video.dataset && video.dataset.src) {
                video.src = video.dataset.src;
            }
            card.classList.remove("is-bg-done");
            video.loop = false;
            video.muted = true;
            video.pause();
            try {
                video.currentTime = 0;
            } catch (e) {}
            var tryPlay = function () {
                var p = video.play();
                if (p && typeof p.catch === "function") {
                    p.catch(function () {
                        card.classList.add("is-bg-done");
                    });
                }
            };
            if (video.readyState >= 2) {
                tryPlay();
            } else {
                var once = function () {
                    video.removeEventListener("canplay", once);
                    tryPlay();
                };
                video.addEventListener("canplay", once);
            }
        });
    },

    resetGardenVnTheaterBg() {
        var root = document.getElementById("scene-theater");
        if (!root) return;
        root.querySelectorAll("video.garden-vn-card-bg").forEach(function (video) {
            video.pause();
        });
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
            this.promptCitizenUpgrade("因果庭院抽卡");
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
        if (!Array.isArray(arr) || !arr.length) return;
        const msg = arr[Math.floor(Math.random() * arr.length)];
        var names = {
            YUME: "Yume · 记录者",
            HANA: "Hana · 引导者",
            ALICE: "Alice · 裁定者",
            AZALEA: "Azalea · 确认",
            MEILING: "Meiling · 清点",
            SHELLA: "Shella · 维持",
            MIZUKI: "Mizuki · 守望",
            SIENNA: "Sienna · 翻牌者"
        };
        var wrap = document.getElementById("character-whisper");
        var whoEl = document.getElementById("character-whisper-who");
        var textEl = document.getElementById("character-whisper-text");
        if (!wrap || !textEl) return;
        clearTimeout(this._whisperTimer);
        if (whoEl) whoEl.textContent = names[maid] || maid;
        textEl.textContent = "“" + msg + "”";
        wrap.classList.remove("hidden", "is-leaving");
        wrap.onclick = function () {
            wrap.classList.add("is-leaving");
            setTimeout(function () { wrap.classList.add("hidden"); wrap.classList.remove("is-leaving"); }, 260);
        };
        this._whisperTimer = setTimeout(function () {
            wrap.classList.add("is-leaving");
            setTimeout(function () { wrap.classList.add("hidden"); wrap.classList.remove("is-leaving"); }, 260);
        }, 4800);
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

    /** Hana 迎宾 section：支持点击立刻出全字、再点击继续 */
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
            var typingDone = false;
            var closed = false;
            var finishDone = function () {
                if (closed) return;
                closed = true;
                overlay.onclick = null;
                if (sprite) sprite.classList.add("hana-dissolve");
                setTimeout(function () {
                    overlay.classList.add("hidden");
                    if (sprite) sprite.classList.remove("hana-dissolve");
                    resolve();
                }, 650);
            };
            var t = setInterval(function() {
                textEl.textContent += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(t);
                    typingDone = true;
                }
            }, 45);
            overlay.onclick = function () {
                if (!typingDone) {
                    clearInterval(t);
                    textEl.textContent = text;
                    typingDone = true;
                    return;
                }
                finishDone();
            };
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
        var finished = await UI.runGalgameFlow({ detail: Game.currentDetail, startFromIndex: progress.questionIndex || 0 });
        if (!finished) {
            this.showScene(ALICE_CONSTANTS.SCENES.MAP);
            return;
        }
        this.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
        App.finishQuiz();
    },

    async handleLogin() {
        var uidEl = document.getElementById("input-uid");
        var pwdEl = document.getElementById("input-pwd");
        const uid = uidEl ? uidEl.value.trim() : "";
        const pwd = pwdEl ? pwdEl.value : "";
        if (!uid || !pwd) {
            if (uidEl && !uid) { uidEl.classList.add("user-invalid-fallback"); uidEl.setAttribute("aria-invalid", "true"); uidEl.focus(); }
            else if (pwdEl && !pwd) { pwdEl.classList.add("user-invalid-fallback"); pwdEl.setAttribute("aria-invalid", "true"); pwdEl.focus(); }
            this.toast("请填写灵魂编号（或昵称）与密码", "warn");
            return;
        }
        this.showLoading("正在核对庭院档案…");
        try {
            var state = await Auth.login(uid, pwd);
            const out = await Auth.refreshFromGAS();
            if (out) this.worldData = out.world;
            this.updateUI();
            this.hideLoading();
            this.toast("欢迎回到庭院，" + (state.name || state.uid), "success");
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
            this.toast(e.message || "认证失败", "error");
        }
    },

    async handleRegister() {
        var nameEl = document.getElementById("reg-name");
        var pwdEl = document.getElementById("reg-pwd");
        var name = nameEl ? nameEl.value.trim() : "";
        var pwd = pwdEl ? pwdEl.value : "";
        if (!name) {
            if (nameEl) { nameEl.classList.add("user-invalid-fallback"); nameEl.setAttribute("aria-invalid", "true"); nameEl.focus(); }
            this.toast("请先填写你想使用的庭院昵称", "warn");
            return;
        }
        if (pwd.length < 3) {
            if (pwdEl) { pwdEl.classList.add("user-invalid-fallback"); pwdEl.setAttribute("aria-invalid", "true"); pwdEl.focus(); }
            this.toast("密码至少需要 3 位字符", "warn");
            return;
        }
        this.showLoading("Yume 正在为你签发庭院编号…");
        try {
            var state = await Auth.register(name, pwd);
            this.updateUI();
            this.hideLoading();
            this.toast("已为你签发编号 " + (state.uid || "") + "（赠 200 因果值）", "success");
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
            this.toast(e.message || "注册失败，请稍后重试", "error");
        }
    },

    handleGuestLogin() {
        this.showLoading("正在开启游客漫游模式…");
        Auth.loginAsGuest();
        this.updateUI();
        this.hideLoading();
        this.toast("已以漫游访客进入 · 可随时免费注册成为市民");
        this.showScene(ALICE_CONSTANTS.SCENES.MAP);
        this.initYumeWall();
        this.tryBgmWelcomePulse();
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
        if (Auth.isGuest()) {
            this.promptCitizenUpgrade("在 Yume 留言墙同步留痕");
            return;
        }
        var input = document.getElementById("wall-input");
        var msg = input ? input.value.trim() : "";
        if (!msg) return;
        var state = Auth.getState();
        this.showLoading("正在写入页边留痕…");
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
                this.toast("你的留痕已记录在留言墙上", "success");
                this.initYumeWall();
            } else {
                this.toast(data.message || "发送失败", "error");
            }
        } catch (e) {
            this.toast("发送失败，请稍后重试", "error");
        }
        this.hideLoading();
    },

    async handleCheckin() {
        if (Auth.isGuest()) {
            this.promptCitizenUpgrade("每日祈愿（+1000 因果值）");
            return;
        }
        const state = Auth.getState();
        if (!state) return;
        const last = localStorage.getItem(ALICE_CONSTANTS.STORAGE.LAST_CHECKIN);
        const today = new Date().toISOString().split("T")[0];
        if (last === today) {
            this.toast("今天已经祈愿过了，明天再来看看吧。");
            return;
        }
        this.showLoading("Meiling 正在清点今天的因果值…");
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
                this.toast("祈愿未能传达，请稍后再试", "error");
                this.hideLoading();
                return;
            }
            if (data.result === "success") {
                Auth.updateLocal({ points: data.newPoints ?? state.points + ALICE_CONSTANTS.BALANCE.DAILY_REWARD });
                localStorage.setItem(ALICE_CONSTANTS.STORAGE.LAST_CHECKIN, today);
                this.updateUI();
                this.toast("祈愿已传达 · 因果值 +" + ALICE_CONSTANTS.BALANCE.DAILY_REWARD, "success");
            } else {
                this.toast(data.message || "祈愿失败", "warn");
            }
        } catch (e) {
            this.toast("祈愿未能传达，请检查网络", "error");
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
                cardImg.src = detail.image ? String(detail.image) : (dir + detail.id + ".webp").replace(/\/+/g, "/");
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

        var aborted = false;
        var activeTimers = [];
        var abortResolvers = [];

        function setProgress(stepIndex, totalCount, labelText) {
            var titleEl = document.getElementById("galgame-card-title");
            var stepEl = document.getElementById("galgame-step-label");
            var fillEl = document.getElementById("galgame-progress-fill");
            if (titleEl) titleEl.textContent = (detail && (detail.name || detail.id)) ? String(detail.name || detail.id) : "因果剧场";
            if (stepEl) stepEl.textContent = labelText || (String(stepIndex).padStart(2, "0") + " / " + String(totalCount).padStart(2, "0"));
            if (fillEl) fillEl.style.width = Math.min(100, Math.max(0, Math.round((stepIndex / totalCount) * 100))) + "%";
        }

        function cleanupExit() {
            activeTimers.forEach(function (id) { clearInterval(id); });
            activeTimers.length = 0;
            abortResolvers.forEach(function (fn) { try { fn(); } catch (e) {} });
            abortResolvers.length = 0;
        }

        var pauseBtn = document.getElementById("galgame-pause-exit");
        if (pauseBtn) {
            pauseBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                aborted = true;
                Game.saveProgress();
                cleanupExit();
                overlay.classList.add("hidden");
                hideChoices();
                if (typeof App !== "undefined" && App.toast) App.toast("当前进度已自动保存，随时可回到庭院继续。");
            };
        }

        /** 点击一次立刻出全字，再点击继续下一句 */
        function playLineAndWait(text) {
            return new Promise(function (resolve) {
                if (aborted || !textEl) return resolve();
                var str = String(text || "");
                textEl.textContent = "";
                if (nextEl) nextEl.textContent = "点击加速";
                var i = 0;
                var typingDone = false;
                var done = false;
                var timer = setInterval(function () {
                    if (aborted) {
                        clearInterval(timer);
                        return;
                    }
                    textEl.textContent += str.charAt(i);
                    i++;
                    if (i >= str.length) {
                        clearInterval(timer);
                        typingDone = true;
                        if (nextEl) nextEl.textContent = "点击继续";
                    }
                }, CHAR_DELAY);
                activeTimers.push(timer);

                var onClick = function (e) {
                    if (e && e.target && e.target.closest && e.target.closest("#galgame-top-hud, #galgame-character-hide-btn")) return;
                    if (done) return;
                    if (!typingDone) {
                        clearInterval(timer);
                        textEl.textContent = str;
                        typingDone = true;
                        if (nextEl) nextEl.textContent = "点击继续";
                        return;
                    }
                    done = true;
                    overlay.removeEventListener("click", onClick);
                    resolve();
                };
                overlay.addEventListener("click", onClick);
                abortResolvers.push(function () {
                    if (done) return;
                    done = true;
                    clearInterval(timer);
                    overlay.removeEventListener("click", onClick);
                    resolve();
                });
            });
        }

        setBackground();
        setCardImg();
        setGalgameHanaEmotion("default");
        if (nameEl) nameEl.textContent = "Hana";
        setProgress(startFromIndex, ALICE_CONSTANTS.BALANCE.QUIZ_COUNT, startFromIndex === 0 ? "序幕" : null);
        showDialogueBox();
        overlay.classList.remove("hidden");
        initGalgameCharacterDragAndHide();

        if (startFromIndex === 0 && (detail.fixedStory || "").trim()) {
            await playLineAndWait(detail.fixedStory.trim());
            if (aborted) return false;
        }

        var questions = Game.getQuestions();
        var totalQ = ALICE_CONSTANTS.BALANCE.QUIZ_COUNT;
        for (var idx = startFromIndex; idx < totalQ; idx++) {
            if (aborted) return false;
            var q = questions[idx];
            if (!q) continue;

            setProgress(idx + 1, totalQ, String(idx + 1).padStart(2, "0") + " / " + String(totalQ).padStart(2, "0"));
            setGalgameHanaEmotion(q.emotion);

            if (q.dialogs && q.dialogs.length > 0) {
                showDialogueBox();
                for (var d = 0; d < q.dialogs.length; d++) {
                    await playLineAndWait(q.dialogs[d]);
                    if (aborted) return false;
                }
            }

            showDialogueBox();
            await playLineAndWait(q.text);
            if (aborted) return false;

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
                abortResolvers.push(function () {
                    if (resolved) return;
                    resolved = true;
                    resolveAnswer();
                });

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
                        manualBtn.textContent = "写下自己的回答…";
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
                            if (typeof App !== "undefined" && App.toast) App.toast("请输入你的回答。", "warn");
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
            if (aborted) return false;
        }

        overlay.classList.add("hidden");
        hideChoices();
        return true;
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
                    App.toast("请输入你的回答。", "warn");
                    return;
                }
                if (text.length > maxLen) {
                    App.toast("回答不能超过 " + maxLen + " 字。", "warn");
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
        this.toast("因果值不足 " + cost + "，请先前往 Meiling 每日祈愿领取因果值。", "warn");
        return;
    }
    var self = this;
    self.showConfirm("抽取一张命运卡牌并进入十题剧场将消耗 " + cost + " 因果值，是否继续？", async function () {
        self.showLoading("庭院正在展开剧场…");
        try {
            const detail = await Game.drawCard();
            var s = Auth.getState();
            if (s) Auth.updateLocal({ points: (s.points || 0) - cost });
            self.updateUI();
            self.hideLoading();
            Game.currentDetail = detail;
            Game.saveProgress();
            var finished = await UI.showCardStory(detail);
            if (!finished) {
                self.showScene(ALICE_CONSTANTS.SCENES.MAP);
                return;
            }
            self.showScene(ALICE_CONSTANTS.SCENES.GARDEN);
            App.finishQuiz();
        } catch (e) {
            self.hideLoading();
            self.toast(e.message || "抽卡失败", "error");
        }
    }, function () {}, { title: "开启因果剧场", okText: "消耗 " + cost + " 并抽卡", cancelText: "先停一会儿" });
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
        this.toast(e.message || "终局生成失败", "error");
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
