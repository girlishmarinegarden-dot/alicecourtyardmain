/**
 * 来自 AliceGarden 的附加功能：昼夜环境、角色设定库、画廊收集展示
 * 不依赖 UserSystem/sentinel，与现有 Auth、CharacterFavor 兼容
 */
(function () {
    "use strict";

    var CHARACTER_INFO = {
        alice: { role: "三女神之一", function: "因果的最终裁决者，掌控秩序", personality: "严格、冷静", color: "#b48cff" },
        yume: { role: "三女神之一", function: "时间的记录者，记忆碎片", personality: "神秘、温柔", color: "#e0e0ff" },
        hana: { role: "四女仆之一", function: "情感的感知者，心灵守护", personality: "温柔、体贴", color: "#a0ffc8" },
        azalea: { role: "四女仆之一", function: "秩序的维护者，规则执行", personality: "严格、守序", color: "#ff6644" },
        meiling: { role: "四女仆之一", function: "音乐与茶艺，心灵慰藉", personality: "温暖、治愈", color: "#ffdd00" },
        shella: { role: "四女仆之一", function: "秘密的守护者，暗夜使者", personality: "神秘、安静", color: "#8844ff" },
        mizuki: { role: "四女仆之一", function: "庭院守卫，安全保障", personality: "严肃、忠诚", color: "#00ffff" }
    };

    /** 根据当前时间 + 心情动态更新背景色（无背景图），并设置 day-mode / night-mode */
    function updateEnvironment() {
        var hour = (new Date()).getHours();
        var root = document.documentElement;
        document.body.classList.remove("day-mode", "night-mode", "mood-calm", "mood-warm", "mood-dream");
        if (hour >= 6 && hour < 18) {
            document.body.classList.add("day-mode");
        } else {
            document.body.classList.add("night-mode");
        }
        /* 按时段设置动态背景色 */
        var primary, secondary, accent;
        if (hour >= 5 && hour < 8) {
            primary = "#0c0a18"; secondary = "#14102a"; accent = "#1a1435";
        } else if (hour >= 8 && hour < 12) {
            primary = "#0e0f1a"; secondary = "#161830"; accent = "#1c1a38";
        } else if (hour >= 12 && hour < 17) {
            primary = "#0f1018"; secondary = "#181428"; accent = "#1e1830";
        } else if (hour >= 17 && hour < 21) {
            primary = "#0d0a14"; secondary = "#140818"; accent = "#1a0c20";
        } else {
            primary = "#080610"; secondary = "#0e0614"; accent = "#140818";
        }
        root.style.setProperty("--bg-primary", primary);
        root.style.setProperty("--bg-secondary", secondary);
        root.style.setProperty("--bg-accent", accent);
        /* 心情覆盖（localStorage 可选：bgMood = calm | warm | dream） */
        var mood = "";
        try {
            mood = (localStorage.getItem("alice_bg_mood") || "").toLowerCase();
        } catch (e) {}
        if (mood === "calm") {
            document.body.classList.add("mood-calm");
            root.style.setProperty("--bg-accent", "#0f1420");
        } else if (mood === "warm") {
            document.body.classList.add("mood-warm");
            root.style.setProperty("--bg-accent", "#1a1410");
        } else if (mood === "dream") {
            document.body.classList.add("mood-dream");
            root.style.setProperty("--bg-accent", "#18101a");
        }
    }

    /** 图书馆：书册与内容来自 assets/books/（booksindex.js 提供 window.LIBRARY_BOOKS / LIBRARY_BOOK_CONTENT） */
    var LIBRARY_CHARS = ["alice", "yume", "hana", "azalea", "meiling", "shella", "mizuki"];
    var libraryCurrentBookId = null;
    var libraryCurrentBookEntries = [];
    var libraryCurrentBookChars = LIBRARY_CHARS.slice();
    var libraryCurrentPage = 0;
    var libraryReaderPages = [];
    var libraryReaderCurrent = 0;
    var libraryReaderTitle = "";
    var READER_CHARS_PER_PAGE = 380;

    function getLibraryEntry(key) {
        var info = CHARACTER_INFO[key];
        if (!info) return null;
        var fullText = info.role + " · " + info.function + "\n\n职能：" + info.function + "\n\n性格：" + info.personality;
        return {
            key: key,
            title: key.toUpperCase(),
            role: info.role,
            function: info.function,
            personality: info.personality,
            fullText: fullText,
            color: info.color || "#888"
        };
    }

    function splitIntoReaderPages(text) {
        var pages = [];
        var s = String(text || "").replace(/\r\n/g, "\n").trim();
        if (!s) return [""];
        while (s.length > 0) {
            if (s.length <= READER_CHARS_PER_PAGE) {
                pages.push(s);
                break;
            }
            var chunk = s.slice(0, READER_CHARS_PER_PAGE);
            var lastBreak = Math.max(chunk.lastIndexOf("\n"), chunk.lastIndexOf("。"), chunk.lastIndexOf(" "), chunk.lastIndexOf("，"));
            if (lastBreak > READER_CHARS_PER_PAGE * 0.4) {
                chunk = s.slice(0, lastBreak + 1);
                s = s.slice(lastBreak + 1).trim();
            } else {
                s = s.slice(READER_CHARS_PER_PAGE);
            }
            pages.push(chunk);
        }
        return pages;
    }

    function renderLibraryBookPage(index) {
        var content = document.getElementById("library-page-content");
        var numEl = document.getElementById("library-page-num");
        var totalEl = document.getElementById("library-page-total");
        if (!content) return;
        var entries = libraryCurrentBookEntries;
        var total = entries.length;
        if (total === 0) {
            var chars = libraryCurrentBookChars.length ? libraryCurrentBookChars : LIBRARY_CHARS;
            total = chars.length;
        }
        libraryCurrentPage = Math.max(0, Math.min(index, total - 1));
        var entry;
        if (entries.length > 0) {
            entry = entries[libraryCurrentPage];
        } else {
            var chars = libraryCurrentBookChars.length ? libraryCurrentBookChars : LIBRARY_CHARS;
            var key = chars[libraryCurrentPage];
            entry = getLibraryEntry(key);
        }
        if (!entry) return;
        var fn = entry.func != null ? entry.func : (entry["function"] != null ? entry["function"] : "");
        if (numEl) numEl.textContent = libraryCurrentPage + 1;
        if (totalEl) totalEl.textContent = total;
        content.innerHTML =
            "<h3 class=\"library-page-title\" style=\"color:" + (entry.color || "#888") + "\">" + (entry.title || "") + "</h3>" +
            "<p class=\"library-page-role\">" + (entry.role || "") + " · " + fn + "</p>" +
            "<p class=\"library-page-p\"><strong>职能：</strong>" + fn + "</p>" +
            "<p class=\"library-page-p\"><strong>性格：</strong>" + (entry.personality || "") + "</p>";
        content.classList.remove("library-page-flip-in");
        content.offsetHeight;
        content.classList.add("library-page-flip-in");
    }

    function openLibraryReader() {
        var entry;
        if (libraryCurrentBookEntries.length > 0) {
            entry = libraryCurrentBookEntries[libraryCurrentPage];
        } else {
            var chars = libraryCurrentBookChars.length ? libraryCurrentBookChars : LIBRARY_CHARS;
            var key = chars[libraryCurrentPage];
            entry = getLibraryEntry(key);
        }
        if (!entry) return;
        libraryReaderTitle = entry.title;
        libraryReaderPages = splitIntoReaderPages(entry.fullText);
        libraryReaderCurrent = 0;
        var overlay = document.getElementById("library-reader");
        var titleEl = document.getElementById("library-reader-title");
        var textEl = document.getElementById("library-reader-text");
        if (overlay) overlay.classList.remove("hidden");
        if (titleEl) titleEl.textContent = entry.title;
        renderLibraryReaderPage();
    }

    function renderLibraryReaderPage() {
        var textEl = document.getElementById("library-reader-text");
        var pageNumEl = document.getElementById("library-reader-page-num");
        var pages = libraryReaderPages;
        var n = libraryReaderCurrent;
        if (textEl && pages.length > 0) {
            textEl.textContent = pages[n] || "";
        }
        if (pageNumEl) pageNumEl.textContent = "第 " + (n + 1) + " / " + pages.length + " 页";
        var btn1 = document.getElementById("library-reader-page-1");
        var btn2 = document.getElementById("library-reader-page-2");
        var btn3 = document.getElementById("library-reader-page-3");
        if (btn1) { btn1.style.display = pages.length >= 1 ? "inline-block" : "none"; btn1.classList.toggle("active", n === 0); }
        if (btn2) { btn2.style.display = pages.length >= 2 ? "inline-block" : "none"; btn2.classList.toggle("active", n === 1); }
        if (btn3) { btn3.style.display = pages.length >= 3 ? "inline-block" : "none"; btn3.classList.toggle("active", n === 2); }
        var prevBtn = document.getElementById("library-reader-prev");
        var nextBtn = document.getElementById("library-reader-next");
        if (prevBtn) prevBtn.style.display = (n > 0) ? "inline-block" : "none";
        if (nextBtn) nextBtn.style.display = (n < pages.length - 1) ? "inline-block" : "none";
    }

    function bindLibraryReader() {
        var overlay = document.getElementById("library-reader");
        var closeBtn = document.getElementById("library-reader-close");
        var prevBtn = document.getElementById("library-reader-prev");
        var nextBtn = document.getElementById("library-reader-next");
        var btn1 = document.getElementById("library-reader-page-1");
        var btn2 = document.getElementById("library-reader-page-2");
        var btn3 = document.getElementById("library-reader-page-3");
        if (closeBtn) closeBtn.onclick = function () { if (overlay) overlay.classList.add("hidden"); };
        if (prevBtn) prevBtn.onclick = function () {
            if (libraryReaderCurrent > 0) {
                libraryReaderCurrent--;
                renderLibraryReaderPage();
            }
        };
        if (nextBtn) nextBtn.onclick = function () {
            if (libraryReaderCurrent < libraryReaderPages.length - 1) {
                libraryReaderCurrent++;
                renderLibraryReaderPage();
            }
        };
        function goToPage(idx) {
            if (idx >= 0 && idx < libraryReaderPages.length) {
                libraryReaderCurrent = idx;
                renderLibraryReaderPage();
            }
        }
        if (btn1) btn1.onclick = function () { goToPage(0); };
        if (btn2) btn2.onclick = function () { goToPage(1); };
        if (btn3) btn3.onclick = function () { goToPage(2); };
    }

    function showLibraryShelf() {
        var shelf = document.getElementById("library-shelf");
        var wrap = document.getElementById("library-book-wrap");
        var backShelfBtn = document.getElementById("library-back-shelf");
        if (shelf) shelf.classList.remove("hidden");
        if (wrap) wrap.classList.add("hidden");
        if (backShelfBtn) backShelfBtn.classList.add("hidden");
    }

    function openLibraryBook(bookId) {
        var books = (typeof window !== "undefined" && window.LIBRARY_BOOKS) ? window.LIBRARY_BOOKS : [];
        var book = books.filter(function (b) { return b.id === bookId; })[0];
        if (!book) return;
        var content = (typeof window !== "undefined" && window.LIBRARY_BOOK_CONTENT) ? window.LIBRARY_BOOK_CONTENT[bookId] : null;
        libraryCurrentBookId = bookId;
        libraryCurrentBookEntries = (content && Array.isArray(content)) ? content.slice() : [];
        libraryCurrentBookChars = (book.chars && book.chars.length) ? book.chars.slice() : LIBRARY_CHARS.slice();
        libraryCurrentPage = 0;
        var shelf = document.getElementById("library-shelf");
        var wrap = document.getElementById("library-book-wrap");
        var backShelfBtn = document.getElementById("library-back-shelf");
        if (shelf) shelf.classList.add("hidden");
        if (wrap) wrap.classList.remove("hidden");
        if (backShelfBtn) backShelfBtn.classList.remove("hidden");
        renderLibraryBookPage(0);
    }

    function renderLibraryCards() {
        var shelf = document.getElementById("library-shelf");
        var wrap = document.getElementById("library-book-wrap");
        var book = document.getElementById("library-book");
        if (!shelf || !book) return;
        showLibraryShelf();
        var backShelfBtn = document.getElementById("library-back-shelf");
        if (backShelfBtn) backShelfBtn.classList.add("hidden");
        shelf.onclick = function (e) {
            var wrapEl = e.target && e.target.closest ? e.target.closest(".library-cover-wrap") : null;
            if (wrapEl) {
                var bookId = wrapEl.getAttribute("data-book-id");
                if (bookId === "manga") {
                    if (typeof App !== "undefined" && App.navigateTo) {
                        App.navigateTo("MANGA_GALLERY");
                    }
                } else if (bookId) {
                    openLibraryBook(bookId);
                }
            }
        };
        var backShelfBtn = document.getElementById("library-back-shelf");
        if (backShelfBtn) backShelfBtn.onclick = showLibraryShelf;
        var prevBtn = document.getElementById("library-prev");
        var nextBtn = document.getElementById("library-next");
        var readFullBtn = document.getElementById("library-read-full");
        if (prevBtn) prevBtn.onclick = function () { renderLibraryBookPage(libraryCurrentPage - 1); };
        if (nextBtn) nextBtn.onclick = function () { renderLibraryBookPage(libraryCurrentPage + 1); };
        if (readFullBtn) readFullBtn.onclick = openLibraryReader;
        bindLibraryReader();
    }

    /** 画廊：仅显示已拥有卡牌（Owncards），流式加载 + 加载更多 */
    function renderOneCardChip(container, c, cardsDir) {
        var id = typeof c === "string" ? c : (c.id || "");
        var name = typeof c === "object" && c.name ? c.name : id;
        var chip = document.createElement("div");
        chip.className = "card-chip owned";
        var imgSrc = (cardsDir + id + ".webp").replace(/\/+/g, "/");
        var img = document.createElement("img");
        img.src = imgSrc;
        img.alt = name || id;
        img.className = "card-chip-img";
        img.draggable = false;
        var caption = document.createElement("span");
        caption.className = "card-chip-name";
        caption.textContent = name || id || "?";
        caption.style.display = "none";
        chip.appendChild(img);
        chip.appendChild(caption);
        img.onerror = function () { this.style.display = "none"; caption.style.display = "block"; };
        container.appendChild(chip);
    }

    /** 每次进入画廊时从 localStorage 读取已拥有卡牌编号，再渲染，避免切换模块后图鉴丢失 */
    function getOwnedCardIdsFromStorage() {
        var storageKey = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.USER_STATE)
            ? ALICE_CONSTANTS.STORAGE.USER_STATE : "AliceGarden_User_State";
        var raw = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (!raw) return { ownedIds: [], uid: "guest" };
        try {
            var state = JSON.parse(raw);
            var list = (state && state.cards && Array.isArray(state.cards))
                ? state.cards
                : (state && state.ownCards && Array.isArray(state.ownCards) ? state.ownCards : []);
            var ownedIds = list.map(function (id) { return String(id).trim(); }).filter(Boolean);
            var uid = (state && state.uid) ? String(state.uid) : "guest";
            return { ownedIds: ownedIds, uid: uid };
        } catch (e) {
            return { ownedIds: [], uid: "guest" };
        }
    }

    function renderGalleryCollection(onDone) {
        var container = document.getElementById("gallery-collection");
        if (!container) {
            if (onDone && typeof onDone === "function") onDone();
            return;
        }
        container.innerHTML = "";
        container.removeAttribute("data-gallery-offset");
        container.removeAttribute("data-gallery-total");
        var parent = container.parentNode;
        var oldLoadMore = parent.querySelector(".gallery-load-more-wrap");
        if (oldLoadMore) oldLoadMore.remove();
        var stored = getOwnedCardIdsFromStorage();
        var ownedIds = stored.ownedIds.slice();
        var uid = stored.uid;
        var progressKey = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.STORAGE && ALICE_CONSTANTS.STORAGE.QUIZ_PROGRESS)
            ? ALICE_CONSTANTS.STORAGE.QUIZ_PROGRESS + "_" + uid : "";
        if (progressKey && typeof localStorage !== "undefined") {
            try {
                var raw = localStorage.getItem(progressKey);
                if (raw) {
                    var p = JSON.parse(raw);
                    if (p && p.cardId) {
                        var pid = String(p.cardId).trim();
                        if (pid && ownedIds.indexOf(pid) === -1) ownedIds.push(pid);
                    }
                }
            } catch (e) {}
        }
        var done = (typeof onDone === "function") ? onDone : null;
        if (ownedIds.length === 0) {
            container.innerHTML = "<p class=\"question-text\">暂无已拥有卡牌，完成庭院抽卡并完成终局后此处会显示收集。</p>";
            if (done) done();
            return;
        }
        var cardsDir = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.PATHS && ALICE_CONSTANTS.PATHS.CARDS_IMAGES) ? ALICE_CONSTANTS.PATHS.CARDS_IMAGES : "assets/cards/";
        function runWithIndex(index) {
            if (!index || index.length === 0) {
                var idToName = {};
                ownedIds.forEach(function (id) { idToName[id] = id; });
                var ownedCards = ownedIds.map(function (id) { return { id: id, name: idToName[id] || id }; });
                renderGalleryBatch(container, ownedCards, cardsDir, parent);
                if (done) done();
                return;
            }
            var idSet = {};
            ownedIds.forEach(function (id) { idSet[id] = true; });
            var ownedCards = index.filter(function (c) {
                var id = typeof c === "string" ? c : (c.id || "");
                return idSet[id];
            });
            if (ownedCards.length === 0) {
                container.innerHTML = "<p class=\"question-text\">暂无已拥有卡牌，完成庭院抽卡并完成终局后此处会显示收集。</p>";
                if (done) done();
                return;
            }
            renderGalleryBatch(container, ownedCards, cardsDir, parent);
            if (done) done();
        }
        try {
            if (typeof Game !== "undefined" && Game.loadCardIndex) {
                Game.loadCardIndex().then(runWithIndex).catch(function () {
                    runWithIndex([]);
                });
                return;
            }
            runWithIndex((typeof Game !== "undefined" && Game.cardIndex) ? Game.cardIndex : []);
        } catch (e) {
            runWithIndex([]);
        }
    }

    function renderGalleryBatch(container, ownedCards, cardsDir, parent) {
        var pageSize = (typeof ALICE_CONSTANTS !== "undefined" && ALICE_CONSTANTS.GALLERY_PAGE_SIZE) ? ALICE_CONSTANTS.GALLERY_PAGE_SIZE : 12;
        var start = container.getAttribute("data-gallery-offset");
        var offset = (start !== null && start !== "" && !isNaN(parseInt(start, 10))) ? parseInt(start, 10) : 0;
        if (offset === 0) container.innerHTML = "";
        var end = Math.min(offset + pageSize, ownedCards.length);
        for (var i = offset; i < end; i++) {
            renderOneCardChip(container, ownedCards[i], cardsDir);
        }
        container.setAttribute("data-gallery-offset", String(end));
        container.setAttribute("data-gallery-total", String(ownedCards.length));
        var oldWrap = parent.querySelector(".gallery-load-more-wrap");
        if (oldWrap) oldWrap.remove();
        if (end < ownedCards.length) {
            var wrap = document.createElement("div");
            wrap.className = "gallery-load-more-wrap";
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "gallery-load-more-btn";
            btn.textContent = "加载更多";
            btn.onclick = function () {
                renderGalleryBatch(container, ownedCards, cardsDir, parent);
            };
            wrap.appendChild(btn);
            parent.appendChild(wrap);
        }
    }

    /** 场景切换时可选：短暂显示转场 */
    function showSceneTransition(callback) {
        var el = document.getElementById("scene-transition");
        if (!el) {
            if (callback) callback();
            return;
        }
        el.classList.add("active");
        setTimeout(function () {
            if (callback) callback();
            setTimeout(function () {
                el.classList.remove("active");
            }, 280);
        }, 220);
    }

    window.AliceFeatures = {
        updateEnvironment: updateEnvironment,
        renderLibraryCards: renderLibraryCards,
        renderGalleryCollection: renderGalleryCollection,
        showSceneTransition: showSceneTransition,
        CHARACTER_INFO: CHARACTER_INFO
    };
    if (document.body) updateEnvironment();
})();
