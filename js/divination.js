/**
 * 占卜模块：庭院 13 张牌 · 过去 / 现在 / 未来
 * 使用 gardenArchetypes，点击水晶球依次抽三张牌，再调用 GAS getThreeCardsAnalysis 显示 Sienna 解析
 */
var Divination = (function () {
    "use strict";

    var PHASES = ["过去", "现在", "未来"];
    var state = {
        step: 0,       // 0=未开始 1=过去 2=现在 3=未来 4=请求中 5=已出结果
        selectedCards: [],
        remainingIds: []
    };

    function getArchetypes() {
        return (typeof window !== "undefined" && window.gardenArchetypes) ? window.gardenArchetypes : [];
    }

    function shuffleAndPickOne(ids) {
        if (!ids || ids.length === 0) return null;
        var idx = Math.floor(Math.random() * ids.length);
        var id = ids[idx];
        ids.splice(idx, 1);
        var list = getArchetypes();
        return list.find(function (c) { return c.id === id; }) || null;
    }

    function initRemaining() {
        state.remainingIds = getArchetypes().map(function (c) { return c.id; });
    }

    function renderPhaseLabel(text) {
        var el = document.getElementById("divination-phase-label");
        if (el) el.textContent = text;
    }

    function renderCrystalLabel(text) {
        var el = document.querySelector(".crystal-ball-label");
        if (el) el.textContent = text;
    }

    function notify(msg, type) {
        if (typeof App !== "undefined" && App.toast) App.toast(msg, type);
        else if (typeof alert === "function") alert(msg);
    }

    function renderCardSlot(index, card) {
        var container = document.getElementById("divination-card-slots");
        if (!container) return;
        var slots = container.querySelectorAll(".divination-card-slot");
        var slot = slots[index];
        if (!slot) return;
        slot.classList.remove("face-down");
        slot.classList.add("face-up");
        if (card) {
            var titleEl = slot.querySelector(".divination-card-title");
            var facEl = slot.querySelector(".divination-card-faction");
            var kwEl = slot.querySelector(".divination-card-kw");
            if (titleEl) titleEl.textContent = card.title || "";
            if (facEl) facEl.textContent = card.faction || "";
            if (kwEl) kwEl.textContent = Array.isArray(card.keywords) ? card.keywords.join(" · ") : "";
            slot.setAttribute("data-phase", PHASES[index]);
        }
    }

    function setCardSlotsVisible(visible) {
        var wrap = document.getElementById("divination-cards-wrap");
        if (wrap) wrap.style.display = visible ? "flex" : "none";
    }

    function resetCardSlots() {
        var container = document.getElementById("divination-card-slots");
        if (!container) return;
        container.querySelectorAll(".divination-card-slot").forEach(function (slot) {
            slot.classList.remove("face-up");
            slot.classList.add("face-down");
            var titleEl = slot.querySelector(".divination-card-title");
            var facEl = slot.querySelector(".divination-card-faction");
            var kwEl = slot.querySelector(".divination-card-kw");
            if (titleEl) titleEl.textContent = "";
            if (facEl) facEl.textContent = "";
            if (kwEl) kwEl.textContent = "";
            slot.removeAttribute("data-phase");
        });
    }

    function bindBlankCard() {
        var saveBtn = document.getElementById("divination-blank-save");
        var noteInput = document.getElementById("divination-blank-note");
        var savedEl = document.getElementById("divination-blank-saved");
        var STORAGE_KEY = "AliceGarden_Card13_Note";
        if (savedEl) {
            try {
                var prev = localStorage.getItem(STORAGE_KEY);
                if (prev) {
                    savedEl.textContent = "上次夹入书页的留痕：「" + prev + "」";
                    savedEl.classList.remove("hidden");
                }
            } catch (e) {}
        }
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = "1";
            saveBtn.addEventListener("click", function () {
                var txt = noteInput ? noteInput.value.trim() : "";
                if (!txt) {
                    if (savedEl) {
                        savedEl.textContent = "你选择了留白——“即使什么都不写，也依然可以存在。”";
                        savedEl.classList.remove("hidden");
                    }
                    notify("第十三张牌已保持空白");
                    return;
                }
                try { localStorage.setItem(STORAGE_KEY, txt); } catch (e) {}
                if (savedEl) {
                    savedEl.textContent = "已夹入第十三张牌：「" + txt + "」";
                    savedEl.classList.remove("hidden");
                }
                if (noteInput) noteInput.value = "";
                notify("已将这句话留给此刻的翻牌者", "success");
            });
        }
    }

    function showResult(data) {
        var wrap = document.getElementById("divination-result-wrap");
        var body = document.getElementById("divination-result-body");
        if (!wrap || !body) return;
        if (!data || typeof data !== "object") {
            body.innerHTML = "<p class=\"divination-result-error\">未能获取解析，请稍后重试。</p>";
        } else {
            var html = "";
            if (data.whisper) html += "<p class=\"divination-whisper\">" + escapeHtml(data.whisper) + "</p>";
            if (data.actions && data.actions.length) {
                html += "<p class=\"divination-section-title\">行动建议</p><ul>";
                data.actions.forEach(function (a) { html += "<li>" + escapeHtml(a) + "</li>"; });
                html += "</ul>";
            }
            if (data.light) html += "<p class=\"divination-section-title\">光明走向</p><p>" + escapeHtml(data.light) + "</p>";
            if (data.shadow) html += "<p class=\"divination-section-title\">阴影走向</p><p>" + escapeHtml(data.shadow) + "</p>";
            if (data.cards && Array.isArray(data.cards)) {
                data.cards.forEach(function (c, i) {
                    if (c.title || c.whisper || c.action || c.light || c.shadow) {
                        html += "<div class=\"divination-card-result\">";
                        html += "<strong>" + escapeHtml(PHASES[i] + " · " + (c.title || "")) + "</strong>";
                        if (c.whisper) html += "<p class=\"card-whisper\">" + escapeHtml(c.whisper) + "</p>";
                        if (c.action) html += "<p class=\"card-action\">" + escapeHtml(c.action) + "</p>";
                        if (c.light) html += "<p class=\"card-light\">" + escapeHtml(c.light) + "</p>";
                        if (c.shadow) html += "<p class=\"card-shadow\">" + escapeHtml(c.shadow) + "</p>";
                        html += "</div>";
                    }
                });
            }
            if (!html) html = "<p>" + escapeHtml(JSON.stringify(data)) + "</p>";
            body.innerHTML = html;
        }
        wrap.classList.remove("hidden");
    }

    function hideResult() {
        var wrap = document.getElementById("divination-result-wrap");
        if (wrap) wrap.classList.add("hidden");
    }

    function escapeHtml(s) {
        if (s == null) return "";
        var div = document.createElement("div");
        div.textContent = String(s);
        return div.innerHTML;
    }

    function onCrystalClick() {
        var step = state.step;
        if (step === 4) return;

        if (step === 0) {
            if (typeof Auth !== "undefined" && Auth.isGuest && Auth.isGuest()) {
                if (typeof App !== "undefined" && App.promptCitizenUpgrade) {
                    App.promptCitizenUpgrade("Sienna 十三牌占卜");
                } else {
                    notify("占卜需要市民身份，请先免费注册。", "warn");
                }
                return;
            }
            if (getArchetypes().length < 3) {
                notify("庭院牌组未加载，请刷新页面重试。", "error");
                return;
            }
            var cost = ALICE_CONSTANTS.BALANCE.DIVINATION_COST || 100;
            var authState = typeof Auth !== "undefined" ? Auth.getState() : null;
            if (!authState || authState.points < cost) {
                notify("因果值不足 " + cost + "，请前往 Meiling 每日祈愿获取。", "warn");
                return;
            }
            var doStart = function () {
                Auth.updateLocal({ points: authState.points - cost });
                if (typeof App !== "undefined" && App.updateUI) App.updateUI();
                initRemaining();
                state.selectedCards = [];
                resetCardSlots();
                setCardSlotsVisible(true);
                renderPhaseLabel("轻触水晶球 · 翻开「过去」");
                renderCrystalLabel("翻开 · 过去");
                state.step = 1;
            };
            if (typeof App !== "undefined" && App.showConfirm) {
                App.showConfirm("十三牌占卜将消耗 " + cost + " 因果值，是否开始翻牌？", doStart, function () {}, { title: "Sienna · 十三牌占卜", okText: "消耗 " + cost + " 并开始", cancelText: "稍后再来" });
            } else {
                doStart();
            }
            return;
        }

        if (step === 1) {
            var card1 = shuffleAndPickOne(state.remainingIds);
            if (!card1) return;
            state.selectedCards.push(card1);
            renderCardSlot(0, card1);
            renderPhaseLabel("点击水晶球 · 现在");
            renderCrystalLabel("现在");
            state.step = 2;
            return;
        }

        if (step === 2) {
            var card2 = shuffleAndPickOne(state.remainingIds);
            if (!card2) return;
            state.selectedCards.push(card2);
            renderCardSlot(1, card2);
            renderPhaseLabel("点击水晶球 · 未来");
            renderCrystalLabel("未来");
            state.step = 3;
            return;
        }

        if (step === 3) {
            var card3 = shuffleAndPickOne(state.remainingIds);
            if (!card3) return;
            state.selectedCards.push(card3);
            renderCardSlot(2, card3);
            state.step = 4;
            renderPhaseLabel("因果解析中…");
            renderCrystalLabel("解析中…");

            var auth = typeof Auth !== "undefined" ? Auth.getState() : null;
            var payload = {
                action: ALICE_CONSTANTS.ACTIONS.GET_THREE_CARDS_ANALYSIS,
                selectedCards: state.selectedCards,
                uid: auth ? auth.uid : null,
                token: typeof Auth !== "undefined" ? Auth.getToken() : null
            };
            if (typeof App !== "undefined" && App.showLoading) App.showLoading("Sienna 解读中…");
            fetch(ALICE_CONSTANTS.GAS_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
                .then(function (res) { return res.text(); })
                .then(function (rawText) {
                    var data = null;
                    try { data = JSON.parse(rawText); } catch (e) {}
                    state.step = 5;
                    renderPhaseLabel("");
                    renderCrystalLabel("重新占卜");
                    if (data && data.result === "success") {
                        if (data.newPoints !== undefined && typeof Auth !== "undefined") Auth.updateLocal({ points: data.newPoints });
                        if (typeof App !== "undefined" && App.updateUI) App.updateUI();
                        showResult(data.analysis);
                    } else {
                        showResult(data);
                    }
                    if (typeof App !== "undefined" && App.hideLoading) App.hideLoading();
                })
                .catch(function () {
                    state.step = 5;
                    renderPhaseLabel("");
                    renderCrystalLabel("重新占卜");
                    showResult(null);
                    if (typeof App !== "undefined" && App.hideLoading) App.hideLoading();
                });
        }

        if (step === 5) {
            state.step = 0;
            state.selectedCards = [];
            hideResult();
            setCardSlotsVisible(false);
            renderPhaseLabel("");
            renderCrystalLabel("开始占卜");
        }
    }

    function init() {
        state.step = 0;
        state.selectedCards = [];
        setCardSlotsVisible(false);
        hideResult();
        renderPhaseLabel("");
        renderCrystalLabel("开始占卜");
        bindBlankCard();
    }

    return {
        onCrystalClick: onCrystalClick,
        init: init
    };
})();
