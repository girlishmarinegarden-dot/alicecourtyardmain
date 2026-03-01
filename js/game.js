/**
 * 抽卡与终局：仅调用 code2.gs(GAS_URL)：generate_fate、update_memory；不调用 code.gs
 */
const Game = {
    cardIndex: [],
    currentCard: null,
    currentDetail: null,
    answers: [],
    questionIndex: 0,

    async loadCardIndex() {
        if (this.cardIndex.length) return this.cardIndex;
        var res = await fetch("assets/data/cards_index.json");
        var raw = await res.text();
        try {
            this.cardIndex = JSON.parse(raw);
        } catch (e) {
            this.cardIndex = [];
        }
        return this.cardIndex;
    },

    async drawCard() {
        try {
            await this.loadCardIndex();
        } catch (e) {
            if (/^file:\/\//i.test(location.href)) {
                throw new Error("请用本地服务器打开（如 npx serve），否则无法加载卡牌。");
            }
            throw new Error("加载卡牌列表失败，请稍后重试。");
        }
        if (!this.cardIndex.length) throw new Error("无卡牌数据");
        var one = this.cardIndex[Math.floor(Math.random() * this.cardIndex.length)];
        var id = typeof one === "string" ? one : one.id;
        var detail;
        try {
            var r = await fetch("assets/data/cards/" + id + ".json");
            var raw = await r.text();
            try {
                detail = JSON.parse(raw);
            } catch (e2) {
                detail = { id: id, name: id, fixedStory: "因果之线交织中…", questions: [] };
            }
        } catch (e) {
            detail = { id: id, name: id, fixedStory: "因果之线交织中…", questions: [] };
        }
        this.currentCard = one;
        this.currentDetail = detail;
        this.answers = [];
        this.questionIndex = 0;
        this.saveProgress();
        return detail;
    },

    getProgressKey() {
        const state = Auth.getState();
        const uid = state ? state.uid : "guest";
        return ALICE_CONSTANTS.STORAGE.QUIZ_PROGRESS + "_" + uid;
    },

    saveProgress() {
        const key = this.getProgressKey();
        const payload = {
            cardId: this.currentDetail && this.currentDetail.id,
            questionIndex: this.questionIndex,
            answers: this.answers.slice()
        };
        localStorage.setItem(key, JSON.stringify(payload));
    },

    loadProgress() {
        const key = this.getProgressKey();
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            const p = JSON.parse(raw);
            if (p.cardId && Array.isArray(p.answers)) {
                return p;
            }
        } catch (e) {}
        return null;
    },

    clearProgress() {
        localStorage.removeItem(this.getProgressKey());
    },

    defaultOptions: ["指引的微光", "脚下的泥土", "远方的钟声", "内心的直觉"],

    /** 支持新 galgame 格式（dialogs/question/emotion/type/options）与旧格式（纯字符串数组） */
    getQuestions() {
        const q = this.currentDetail && this.currentDetail.questions;
        const opts = this.defaultOptions;
        if (!Array.isArray(q) || q.length < ALICE_CONSTANTS.BALANCE.QUIZ_COUNT) {
            return Array(ALICE_CONSTANTS.BALANCE.QUIZ_COUNT).fill(null).map((_, i) => ({
                text: `第 ${i + 1} 题：当你步入迷雾，你更愿意相信？`,
                options: opts,
                dialogs: [],
                emotion: "default",
                type: "manual",
                manualInput: false
            }));
        }
        return q.slice(0, ALICE_CONSTANTS.BALANCE.QUIZ_COUNT).map(item => {
            if (typeof item === "string") {
                return {
                    text: item,
                    options: opts,
                    dialogs: [],
                    emotion: "default",
                    type: "manual",
                    manualInput: false
                };
            }
            return {
                text: item.question || item.text || "",
                options: Array.isArray(item.options) ? item.options : opts,
                dialogs: Array.isArray(item.dialogs) ? item.dialogs : [],
                emotion: item.emotion || "default",
                type: item.type || "manual",
                manualInput: !!item.manualInput
            };
        });
    },

    answer(optionIndexOrText) {
        this.answers.push(optionIndexOrText);
        this.questionIndex = this.answers.length;
        this.saveProgress();
    },

    isComplete() {
        return this.answers.length >= ALICE_CONSTANTS.BALANCE.QUIZ_COUNT;
    },

    /** 打包：卡的故事 + 问题1+答案1 … 问题10+答案10，供 Alice API 使用 */
    buildFatePayload() {
        var detail = this.currentDetail;
        var cardStory = (detail && (detail.fixedStory || detail.story)) ? String(detail.fixedStory || detail.story) : "";
        if (detail && detail.name && !cardStory) cardStory = "卡牌：" + (detail.name || detail.id || "") + "。";
        var questions = this.getQuestions();
        var answers = this.answers.slice();
        var questionAnswers = [];
        for (var i = 0; i < ALICE_CONSTANTS.BALANCE.QUIZ_COUNT; i++) {
            var q = questions[i];
            var qText = (q && (q.text || q.question)) ? String(q.text || q.question) : "第" + (i + 1) + "题";
            var aText = i < answers.length ? String(answers[i]) : "";
            questionAnswers.push({ question: qText, answer: aText });
        }
        return {
            cardStory: cardStory,
            questionAnswers: questionAnswers
        };
    },

    async submitToAlice() {
        var state = Auth.getState();
        var token = Auth.getToken();
        var fateData = this.buildFatePayload();
        var payload = {
            action: ALICE_CONSTANTS.ACTIONS.GENERATE,
            uid: state ? state.uid : "",
            token: token || "",
            cardId: this.currentDetail && this.currentDetail.id,
            userChoices: this.answers.slice(),
            cardStory: fateData.cardStory,
            questionAnswers: fateData.questionAnswers,
            newPoints: state ? state.points : 0
        };
        var url = ALICE_CONSTANTS.GAS_URL;
        try {
            await fetch(url, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
        } catch (e) {}
        var res;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            throw new Error("网络请求失败，请检查网络或稍后重试。");
        }
        var rawText = await res.text();
        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error("终局接口返回非 JSON，请检查 GAS 是否正常部署。");
        }
        if (data.result !== "success") {
            throw new Error(data.message || "终局生成失败");
        }
        const fateText = data.fate || data.fateText || data.memory || "";
        return fateText;
    },

    async updateMemoryOnGAS(fateText) {
        var state = Auth.getState();
        var token = Auth.getToken();
        var points = state ? state.points : 0;
        var cards = (state && state.cards && Array.isArray(state.cards)) ? state.cards.slice() : [];
        if (this.currentDetail && this.currentDetail.id) {
            var id = String(this.currentDetail.id).trim();
            if (id && cards.indexOf(id) === -1) cards.push(id);
        }
        var payload = {
            action: ALICE_CONSTANTS.ACTIONS.UPDATE_MEMORY,
            uid: state ? state.uid : "",
            token: token || "",
            memory: fateText,
            points: points,
            cards: cards
        };
        var res = await fetch(ALICE_CONSTANTS.GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        var rawText = await res.text();
        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            return;
        }
        if (data.result === "success") {
            Auth.updateLocal({ memory: fateText, cards: cards });
        }
    },

    /** 根据结局文本选择背景图路径（白之书 / 黑之书 / 默认；同时出现两者则用 normal） */
    getEndingBgPath(fateText) {
        var path = (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.ENDING_BG_NORMAL) || "ending/normalending.webp";
        if (typeof fateText !== "string") return path;
        var hasWhite = fateText.indexOf("白之书") !== -1;
        var hasBlack = fateText.indexOf("黑之书") !== -1;
        if (hasWhite && hasBlack) return path;
        if (hasWhite) return (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.ENDING_BG_WHITE) || "ending/whiteending.webp";
        if (hasBlack) return (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.ENDING_BG_BLACK) || "ending/blackending.webp";
        return path;
    },

    /** 将图片 URL 转为 base64 data URL，失败返回空字符串 */
    async fetchImageAsDataUrl(url) {
        try {
            var res = await fetch(url);
            if (!res.ok) return "";
            var blob = await res.blob();
            return new Promise(function(resolve) {
                var r = new FileReader();
                r.onload = function() { resolve(r.result || ""); };
                r.onerror = function() { resolve(""); };
                r.readAsDataURL(blob);
            });
        } catch (e) {
            return "";
        }
    },

    /** 生成 galgame 风格结局 HTML：卡牌号/名/图、背景图、翻译按钮 */
    buildEndingHtml(fateText, cardName, cardId, cardImageDataUrl, bgImageDataUrl) {
        const text = (fateText != null ? String(fateText) : "").trim() || "（暂无结局文本）";
        const rawTitle = (cardName != null ? cardName : (this.currentDetail && this.currentDetail.name)) || "终局";
        const rawId = (cardId != null ? String(cardId) : (this.currentDetail && this.currentDetail.id)) || "";
        const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const escaped = escapeHtml(text);
        const titleEsc = escapeHtml(rawTitle);
        const idEsc = escapeHtml(rawId);
        const encoded = encodeURIComponent(text);
        const gUrl = (tl) => "https://translate.google.com/?sl=auto&tl=" + tl + "&op=translate&text=" + encoded;
        const bgStyle = (bgImageDataUrl && bgImageDataUrl.length > 0)
            ? "background-image:url(" + bgImageDataUrl.replace(/"/g, "&quot;") + ");background-size:cover;background-position:center;"
            : "";
        const cardImgHtml = (cardImageDataUrl && cardImageDataUrl.length > 0)
            ? "<img class=\"ending-card-img\" src=\"" + cardImageDataUrl.replace(/"/g, "&quot;") + "\" alt=\"" + idEsc + "\">"
            : "";
        return "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>" + titleEsc + " - 结局</title>\n<style>\n" +
            "*{box-sizing:border-box;margin:0;padding:0}\nbody{min-height:100vh;background:linear-gradient(180deg,#0a0a14 0%,#1a1528 30%,#0f0e1a 100%);color:rgba(255,255,255,0.92);font-family:\"Noto Serif SC\",\"Source Han Serif CN\",Georgia,serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;line-height:2.2}\n" +
            ".ending-wrap{max-width:42rem;width:100%;position:relative}\n" +
            ".ending-wrap::before{content:'';position:absolute;inset:-20px;background:radial-gradient(ellipse 80% 50% at 50% 0%,rgba(120,80,160,0.15),transparent 70%);pointer-events:none}\n" +
            ".ending-card-info{display:flex;align-items:center;gap:1.25rem;margin-bottom:1.5rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.15)}\n" +
            ".ending-card-img{width:80px;height:120px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.2);flex-shrink:0}\n" +
            ".ending-card-meta{flex:1}\n" +
            ".ending-card-id{font-size:0.85rem;letter-spacing:0.15em;color:rgba(255,235,200,0.7);margin-bottom:0.25rem}\n" +
            ".ending-card-name{font-size:1.1rem;color:rgba(255,255,255,0.95)}\n" +
            ".ending-title{font-size:1rem;letter-spacing:0.4em;color:rgba(255,235,200,0.85);margin-bottom:1.25rem;text-align:center}\n" +
            ".ending-text{font-size:1.05rem;white-space:pre-wrap;word-break:break-word;padding:1.5rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,0.12);" + bgStyle + "}\n" +
            ".translate-bar{display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:2rem;justify-content:center}\n" +
            ".translate-bar a{display:inline-block;padding:0.5rem 1rem;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.25);border-radius:8px;color:rgba(255,255,255,0.9);text-decoration:none;font-size:0.9rem;transition:background 0.2s,border-color 0.2s}\n" +
            ".translate-bar a:hover{background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4)}\n" +
            ".ending-footer{margin-top:2rem;font-size:0.8rem;color:rgba(255,255,255,0.45)}\n" +
            "</style>\n</head>\n<body>\n<div class=\"ending-wrap\">\n" +
            (rawId || cardImgHtml ? "<div class=\"ending-card-info\">" + cardImgHtml + "<div class=\"ending-card-meta\"><p class=\"ending-card-id\">" + (rawId ? "卡牌号 " + idEsc : "") + "</p><p class=\"ending-card-name\">" + titleEsc + "</p></div></div>\n" : "") +
            "<p class=\"ending-title\">" + (rawId || cardImgHtml ? "结局" : titleEsc) + "</p>\n" +
            "<div class=\"ending-text\" id=\"ending-text\">" + escaped + "</div>\n" +
            "<div class=\"translate-bar\">\n" +
            "<a href=\"" + gUrl("zh-CN") + "\" target=\"_blank\" rel=\"noopener\">中文</a>\n" +
            "<a href=\"" + gUrl("en") + "\" target=\"_blank\" rel=\"noopener\">English</a>\n" +
            "<a href=\"" + gUrl("ms") + "\" target=\"_blank\" rel=\"noopener\">Bahasa Melayu</a>\n" +
            "</div>\n<p class=\"ending-footer\">使用上方按钮可在 Google 翻译中查看中文 / 英文 / 马来文</p>\n</div>\n</body>\n</html>";
    },

    async downloadEnding(fateText, cardName) {
        const baseName = (cardName != null ? cardName : (this.currentDetail && this.currentDetail.name)) || "终局";
        const safeName = String(baseName).replace(/[/\\?*:"|<>]/g, "_");
        const dateStr = new Date().toISOString().slice(0, 10);
        const name = safeName + "_" + dateStr + ".html";
        const cardId = (this.currentDetail && this.currentDetail.id) ? String(this.currentDetail.id) : "";
        const cardsDir = (ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.CARDS_IMAGES) || "assets/cards/";
        const cardImageUrl = cardId ? (cardsDir + cardId + ".webp").replace(/\/+/g, "/") : "";
        const bgPath = this.getEndingBgPath(fateText);
        let bgDataUrl = "";
        let cardDataUrl = "";
        try {
            bgDataUrl = await this.fetchImageAsDataUrl(bgPath);
            if (cardImageUrl) cardDataUrl = await this.fetchImageAsDataUrl(cardImageUrl);
        } catch (e) {}
        const html = this.buildEndingHtml(fateText, cardName, cardId, cardDataUrl, bgDataUrl);
        const blob = new Blob(["\uFEFF" + html], { type: "text/html;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }
};
