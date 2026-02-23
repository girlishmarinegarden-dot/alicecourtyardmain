/**
 * 角色好感度状态机：根据好感度显示对应表情立绘，无图时回退 default
 * 点击立绘时显示好感度 + 情绪符号浮层
 */
const CharacterFavor = {
    _favor: null,

    /** 好感度等级 Lv1-Lv5 → 中文标签 + 情绪符号（点击立绘时展示） */
    FAVOR_LEVEL_DISPLAY: {
        lv1: { label: "未连接", symbol: "💔", text: "LV1" },
        lv2: { label: "初始记录", symbol: "📋", text: "LV2" },
        lv3: { label: "信任", symbol: "❤", text: "LV3" },
        lv4: { label: "高权限", symbol: "💕", text: "LV4" },
        lv5: { label: "连接", symbol: "✨", text: "LV5" }
    },

    getFavorData() {
        if (this._favor) return this._favor;
        var raw = localStorage.getItem(ALICE_CONSTANTS.STORAGE.CHARACTER_FAVOR);
        try {
            this._favor = raw ? JSON.parse(raw) : {};
        } catch (e) {
            this._favor = {};
        }
        return this._favor;
    },

    getFavor(charId) {
        var data = this.getFavorData();
        var n = Number(data[charId]);
        return isNaN(n) || n < 0 ? 0 : Math.min(100, n);
    },

    setFavor(charId, value) {
        var data = this.getFavorData();
        data[charId] = Math.max(0, Math.min(100, Number(value)));
        this._favor = data;
        localStorage.setItem(ALICE_CONSTANTS.STORAGE.CHARACTER_FAVOR, JSON.stringify(data));
    },

    addFavor(charId, delta) {
        this.setFavor(charId, this.getFavor(charId) + delta);
    },

    /** 好感度数值 → 等级 Lv1-Lv5（0-20 / 21-40 / 41-70 / 71-90 / 91-100） */
    getFavorabilityLevel(charId) {
        var n = this.getFavor(charId);
        if (n <= 20) return "lv1";
        if (n <= 40) return "lv2";
        if (n <= 70) return "lv3";
        if (n <= 90) return "lv4";
        return "lv5";
    },

    /** 用于点击立绘展示：{ value, level, levelNum, label, symbol, text } */
    getFavorDisplay(charId) {
        var value = this.getFavor(charId);
        var level = this.getFavorabilityLevel(charId);
        var disp = this.FAVOR_LEVEL_DISPLAY[level];
        var levelNum = (level && level.replace) ? level.replace("lv", "") : "1";
        return {
            value: value,
            level: level,
            levelNum: levelNum,
            label: disp ? disp.label : "—",
            symbol: disp ? disp.symbol : "—",
            text: disp ? disp.text : "—"
        };
    },

    /** 角色 id → 显示名（用于浮层标题） */
    getCharacterDisplayName(charId) {
        var names = { hana: "Hana", alice: "Alice", yume: "Yume", azalea: "Azalea", meiling: "Meiling", shella: "Shella", mizuki: "Mizuki", sienna: "Sienna" };
        return names[charId] || (charId ? (charId.charAt(0).toUpperCase() + charId.slice(1)) : "—");
    },

    /** 好感度 0-100 映射到立绘心情（心情1.webp～心情5.webp，对应 Lv1-Lv5） */
    getEmotionByFavor(charId) {
        var level = this.getFavorabilityLevel(charId);
        var map = { lv1: "心情1", lv2: "心情2", lv3: "心情3", lv4: "心情4", lv5: "心情5" };
        return map[level] || "心情1";
    },

    /** 返回该角色某表情的图片路径（约定：default 用 cfg.default，其余 assets/characters/{charId}_{emotion}.webp） */
    getSpritePath(charId, emotion) {
        var cfg = ALICE_CONSTANTS.CHARACTERS && ALICE_CONSTANTS.CHARACTERS[charId];
        var defaultPath = cfg && cfg.default ? cfg.default : "assets/characters/" + charId + "default.webp";
        if (!emotion || emotion === "default") return defaultPath;
        return "assets/characters/" + charId + "_" + emotion + ".webp";
    },

    /** 获取角色默认图路径（无图时显示用） */
    getDefaultPath(charId) {
        var cfg = ALICE_CONSTANTS.CHARACTERS && ALICE_CONSTANTS.CHARACTERS[charId];
        return (cfg && cfg.default) ? cfg.default : "assets/characters/" + charId + "default.webp";
    },

    /**
     * 设置立绘 img 元素：按 charId + emotion 显示，加载失败则显示 default 图
     * @param {HTMLImageElement} img - 立绘 img 元素
     * @param {string} charId - 角色 id（如 "hana"）
     * @param {string} [emotion] - 表情 key，不传则按好感度自动选
     */
    setSprite(img, charId, emotion) {
        if (!img) return;
        img.draggable = false;
        if (charId) {
            img.dataset.charId = charId;
            img.classList.add("js-favor-sprite");
        }
        var emo = emotion != null ? emotion : this.getEmotionByFavor(charId);
        var path = this.getSpritePath(charId, emo);
        var defaultPath = this.getDefaultPath(charId);

        img.style.display = "";
        img.alt = charId;
        delete img.dataset.fallbackUsed;
        img.onerror = function() {
            var used = img.dataset.fallbackUsed || "0";
            if (used === "2") {
                img.src = (typeof window !== "undefined" && window.ASSET_PLACEHOLDER) ? window.ASSET_PLACEHOLDER : "";
                img.onerror = null;
                return;
            }
            if (used === "1") {
                img.dataset.fallbackUsed = "2";
                img.src = "assets/characters/" + charId + ".webp";
                return;
            }
            img.dataset.fallbackUsed = "1";
            img.src = defaultPath;
        };
        img.src = path;
    },

    /**
     * 显示角色到指定 img：不传 emotion 则按好感度；无图时显示 default
     */
    showCharacter(img, charId, emotion) {
        this.setSprite(img, charId, emotion);
    },

    /** 停留计时：在该角色立绘存在的场景每停留 1 分钟 +1 好感 */
    _stayTimer: null,
    _stayCharId: null,

    startStayTimer(charId) {
        this.stopStayTimer();
        if (!charId) return;
        this._stayCharId = charId;
        var self = this;
        this._stayTimer = setInterval(function () {
            self.addFavor(self._stayCharId, 1);
        }, 60000);
    },

    stopStayTimer() {
        if (this._stayTimer) {
            clearInterval(this._stayTimer);
            this._stayTimer = null;
        }
        this._stayCharId = null;
    },

    /** 好感度浮层：单例 DOM + 定时/点击外部关闭 */
    _popoverEl: null,
    _popoverHideTimer: null,

    _getPopover() {
        if (this._popoverEl) return this._popoverEl;
        var el = document.createElement("div");
        el.id = "favor-popover";
        el.className = "favor-popover glass-panel hidden";
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
        this._popoverEl = el;
        return el;
    },

    _hidePopover() {
        var el = this._getPopover();
        el.classList.add("hidden");
        if (this._popoverHideTimer) {
            clearTimeout(this._popoverHideTimer);
            this._popoverHideTimer = null;
        }
    },

    /**
     * 在锚点元素附近显示好感度浮层（好感度 + 情绪符号）
     * @param {HTMLElement} anchor - 立绘元素
     * @param {string} charId - 角色 id
     */
    showFavorPopover(anchor, charId) {
        if (!charId || !anchor) return;
        var display = this.getFavorDisplay(charId);
        var name = this.getCharacterDisplayName(charId);
        var popover = this._getPopover();
        popover.innerHTML = "<span class=\"favor-popover-name\">" + name + "</span> " +
            "<span class=\"favor-popover-value\">好感度 " + display.value + "</span> " +
            "<span class=\"favor-popover-level\">Lv" + display.levelNum + " " + display.label + "</span> " +
            "<span class=\"favor-popover-emotion\">" + display.text + display.symbol + "</span>";
        popover.classList.remove("hidden");

        var rect = anchor.getBoundingClientRect();
        var popRect = popover.getBoundingClientRect();
        var padding = 8;
        var left = rect.left + (rect.width / 2) - (popRect.width / 2);
        var top = rect.top + rect.height * 0.15 - popRect.height / 2;
        if (top < padding) top = rect.top + padding;
        if (top + popRect.height > rect.bottom - padding) top = rect.bottom - popRect.height - padding;
        popover.style.left = (left < padding ? padding : left > window.innerWidth - popRect.width - padding ? window.innerWidth - popRect.width - padding : left) + "px";
        popover.style.top = (top < padding ? padding : top) + "px";

        if (this._popoverHideTimer) clearTimeout(this._popoverHideTimer);
        this._popoverHideTimer = setTimeout(function self() {
            CharacterFavor._hidePopover();
        }, 2500);
    },

    /** 为所有带 .js-favor-sprite 的立绘绑定点击/触摸显示好感度（手机端用 touchend 捕获） */
    initFavorClick() {
        document.addEventListener("click", function (e) {
            var sprite = e.target.closest(".js-favor-sprite");
            if (sprite && sprite.dataset.charId) {
                e.preventDefault();
                e.stopPropagation();
                CharacterFavor.showFavorPopover(sprite, sprite.dataset.charId);
                return;
            }
            CharacterFavor._hidePopover();
        });
        document.addEventListener("touchend", function (e) {
            var sprite = e.target.closest(".js-favor-sprite");
            if (sprite && sprite.dataset.charId) {
                e.preventDefault();
                e.stopPropagation();
                CharacterFavor.showFavorPopover(sprite, sprite.dataset.charId);
            }
        }, { capture: true, passive: false });
    }
};

if (typeof window !== "undefined") {
    window.CharacterFavor = CharacterFavor;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { CharacterFavor.initFavorClick(); });
    } else {
        CharacterFavor.initFavorClick();
    }
}
