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

    downloadEnding(fateText, cardName) {
        const baseName = (cardName != null ? cardName : (this.currentDetail && this.currentDetail.name)) || "终局";
        const safeName = String(baseName).replace(/[/\\?*:"|<>]/g, "_");
        const dateStr = new Date().toISOString().slice(0, 10);
        const name = safeName + "_" + dateStr + ".txt";
        const blob = new Blob([fateText != null ? String(fateText) : ""], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }
};
