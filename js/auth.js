/**
 * 认证与状态：仅调用 code2.gs（ALICE_CONSTANTS.GAS_URL）
 * 接口：POST login(uid,password) / GET fetch_core(uid,token)；不调用 code.gs
 */
const Auth = {
    state: null,
    token: null,

    getState() {
        if (this.state) return this.state;
        const raw = localStorage.getItem(ALICE_CONSTANTS.STORAGE.USER_STATE);
        if (!raw) return null;
        try {
            this.state = JSON.parse(raw);
            return this.state;
        } catch (e) {
            return null;
        }
    },

    getToken() {
        if (this.token !== null) return this.token;
        this.token = localStorage.getItem(ALICE_CONSTANTS.STORAGE.TOKEN);
        return this.token;
    },

    isCitizen() {
        const s = this.getState();
        return s && s.role === ALICE_CONSTANTS.ROLES.CITIZEN;
    },

    canEnterGarden() { return this.isCitizen(); },
    canEnterMarket() { return this.isCitizen(); },

    async login(uid, password) {
        var url = ALICE_CONSTANTS.GAS_URL;
        var payload = {
            action: "login",
            uid: String(uid).trim(),
            password: String(password)
        };
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
            var isFile = /^file:\/\//i.test(location.href);
            throw new Error(isFile
                ? "无法连接服务器（当前是 file:// 打开）。请用本地服务器打开：在项目目录运行 npx serve 或 python -m http.server 8080，再访问终端显示的地址。"
                : "网络请求失败，请检查网络或 GAS 是否已部署为「任何人」可访问。");
        }
        var rawText = await res.text();
        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error("认证返回非 JSON，请检查 GAS 部署与代码。");
        }
        if (data.result !== "success") {
            throw new Error(data.message || "认证失败");
        }
        var token = data.token || data.sessionToken || "";
        var user = data.userData || data.user || {};
        this.token = token;
        this.state = {
            uid: user.uid || uid,
            name: user.name || user.userName || "旅人",
            role: user.role || user.userRole || ALICE_CONSTANTS.ROLES.GUEST,
            points: Number(user.points ?? user.userPoints ?? 0),
            memory: user.memory || user.userMemory || "",
            cards: Array.isArray(user.cards) ? user.cards : (user.ownCards || [])
        };
        localStorage.setItem(ALICE_CONSTANTS.STORAGE.TOKEN, token);
        localStorage.setItem(ALICE_CONSTANTS.STORAGE.USER_STATE, JSON.stringify(this.state));
        return this.state;
    },

    async refreshFromGAS() {
        var token = this.getToken();
        var state = this.getState();
        if (!token && !state) return null;
        var uid = state ? state.uid : "";
        var url = ALICE_CONSTANTS.GAS_URL + "?action=fetch_core&uid=" + encodeURIComponent(uid) + "&token=" + encodeURIComponent(token || "");
        var res = await fetch(url);
        var rawText = await res.text();
        var data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            this.logout();
            return null;
        }
        if (data.result !== "success") {
            this.logout();
            return null;
        }
        if (data.userData) {
            const u = data.userData;
            this.state = {
                uid: u.uid || this.state.uid,
                name: u.name || u.userName || this.state.name,
                role: u.role || u.userRole || this.state.role,
                points: Number(u.points ?? u.userPoints ?? this.state.points ?? 0),
                memory: u.memory || u.userMemory || this.state.memory || "",
                cards: Array.isArray(u.cards) ? u.cards : (u.ownCards || this.state.cards || [])
            };
            localStorage.setItem(ALICE_CONSTANTS.STORAGE.USER_STATE, JSON.stringify(this.state));
        }
        return { world: data, state: this.state };
    },

    logout() {
        this.state = null;
        this.token = null;
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.indexOf("AliceGarden") === 0) keysToRemove.push(key);
        }
        keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    },

    updateLocal(updates) {
        const s = this.getState();
        if (!s) return;
        if (updates.points !== undefined) s.points = updates.points;
        if (updates.memory !== undefined) s.memory = updates.memory;
        if (updates.cards !== undefined) s.cards = updates.cards;
        this.state = s;
        localStorage.setItem(ALICE_CONSTANTS.STORAGE.USER_STATE, JSON.stringify(s));
    }
};
