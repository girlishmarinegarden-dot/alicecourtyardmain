/**
 * Mirror 模块逻辑（observationhtml.txt 全部功能，仅 observation 页使用）
 * 职责：入口、Tab 切换、Core/Entities/Anomalies/Question 渲染、entity 详情面板、彩蛋
 */
(function () {
    "use strict";

    var params = typeof URLSearchParams !== "undefined" ? new URLSearchParams(window.location.search) : null;
    var currentLayer = params && params.get("layer") === "deep" ? "deep" : "mirror";
    var currentTrace = params ? (params.get("trace") || "") : "";
    var validTraces = ["core", "signal", "record"];
    var normalizedTrace = currentTrace && validTraces.indexOf(currentTrace) >= 0 ? currentTrace : "";
    var isDeepLayer = currentLayer === "deep";
    var isTraceMode = isDeepLayer && normalizedTrace === "core";
    var traceToTabMap = { core: "core", signal: "signal", record: "records" };
    var MAIN_SITE_USER_STATE = "AliceGarden_User_State";
    var MAIN_SITE_LAST_CHECKIN = "AliceGarden_Last_Checkin";
    var MAIN_SITE_LAST_SCENE = "AliceGarden_LastScene";
    var observerId = (params && params.get("observer")) ? String(params.get("observer")).trim() : "";
    var mainSiteState = null;
    try {
        var raw = typeof localStorage !== "undefined" ? localStorage.getItem(MAIN_SITE_USER_STATE) : null;
        mainSiteState = raw ? JSON.parse(raw) : null;
        if (!observerId && mainSiteState && mainSiteState.uid) observerId = String(mainSiteState.uid);
    } catch (e) {
        mainSiteState = null;
    }
    var hasObserver = observerId.length > 0;

    function getConnectionState() {
        var role = (mainSiteState && mainSiteState.role) ? String(mainSiteState.role) : "GUEST";
        var points = (mainSiteState && mainSiteState.points != null) ? Number(mainSiteState.points) : 0;
        var cards = (mainSiteState && mainSiteState.cards && Array.isArray(mainSiteState.cards)) ? mainSiteState.cards : [];
        var checkinToday = false;
        try {
            var lastCheckin = typeof localStorage !== "undefined" ? localStorage.getItem(MAIN_SITE_LAST_CHECKIN) : null;
            if (lastCheckin) {
                var today = new Date().toISOString().slice(0, 10);
                checkinToday = lastCheckin.slice(0, 10) === today;
            }
        } catch (e) {}
        var questionAnswer = "";
        try { questionAnswer = localStorage.getItem(QUESTION_ANSWER_KEY) || ""; } catch (e) {}
        var lastScene = "";
        try { lastScene = (typeof localStorage !== "undefined" ? localStorage.getItem(MAIN_SITE_LAST_SCENE) : null) || ""; } catch (e) {}
        return { role: role, points: points, cards: cards, checkinToday: checkinToday, questionAnswer: questionAnswer, lastScene: lastScene };
    }

    var D = typeof OBSERVATION_DATA !== "undefined" ? OBSERVATION_DATA : {};
    var VISIT_STORAGE_KEY = "AliceGarden_Observation_VisitCount";
    var LAST_TAB_KEY = "AliceGarden_Observation_LastTab";
    var DEEP_LAST_TAB_KEY = "AliceGarden_Observation_Deep_LastTab";
    var LAST_OBSERVER_KEY = "AliceGarden_Observation_LastObserver";
    var QUESTION_ANSWER_KEY = "AliceGarden_Observation_QuestionAnswer";
    var GODKILL_COUNT_KEY = "AliceGarden_Observation_GodKillCount";
    var godkillBuffer = "";
    var godkillLock = false;
    var moelFlashTimer = null;
    var deepSentenceTimer = null;
    var visitCount = 0;
    var lastScrollY = 0;

    function byId(id) { return document.getElementById(id); }
    function addClass(el, c) { if (el) el.classList.add(c); }
    function removeClass(el, c) { if (el) el.classList.remove(c); }
    function hasClass(el, c) { return el && el.classList.contains(c); }
    function show(el) { if (el) el.classList.remove("hidden"); }
    function hide(el) { if (el) el.classList.add("hidden"); }

    function escapeHtml(s) {
        if (typeof s !== "string") return "";
        var div = document.createElement("div");
        div.textContent = s;
        return div.innerHTML;
    }

    function nl2br(s) {
        if (typeof s !== "string") return "";
        return escapeHtml(s).replace(/\n/g, "<br>");
    }

    function getTabsForCurrentLayer() {
        if (isDeepLayer && D.deep && D.deep.tabs) return D.deep.tabs;
        return [
            { key: "core", label: "Core" },
            { key: "entities", label: "Entities" },
            { key: "anomalies", label: "Anomalies" },
            { key: "question", label: "Question" }
        ];
    }

    function getValidTabKeys() {
        var tabs = getTabsForCurrentLayer();
        return tabs.map(function (t) { return t.key; });
    }

    function showBody() {
        var entry = byId("observation-entry");
        var body = byId("observation-body");
        var shell = document.querySelector(".observation-shell");
        if (entry) addClass(entry, "observation-entry-leaving");
        setTimeout(function () {
            if (entry) hide(entry);
            if (body) {
                removeClass(body, "hidden");
                addClass(body, "observation-body-enter");
            }
            if (shell) addClass(shell, "observation-body-visible");
            scrollContentToTop();
            var storageKey = isDeepLayer ? DEEP_LAST_TAB_KEY : LAST_TAB_KEY;
            var lastTab = "";
            try { lastTab = localStorage.getItem(storageKey) || ""; } catch (e) {}
            var validKeys = getValidTabKeys();
            if (lastTab && validKeys.indexOf(lastTab) >= 0) {
                switchTab(lastTab);
            } else {
                renderPanel(validKeys[0] || "core");
            }
            if (!isDeepLayer) maybeShowDeepSentence();
        }, 220);
    }

    function scrollContentToTop() {
        var content = byId("observation-content");
        var panels = document.querySelector(".observation-panels");
        if (content) content.scrollTop = 0;
        if (panels) panels.scrollTop = 0;
        try { window.scrollTo(0, 0); } catch (e) {}
    }

    function switchTab(tabName) {
        var validTabs = getTabsForCurrentLayer().map(function (t) { return t.key; });
        if (validTabs.indexOf(tabName) < 0) tabName = validTabs[0] || "core";
        var storageKey = isDeepLayer ? DEEP_LAST_TAB_KEY : LAST_TAB_KEY;
        try { localStorage.setItem(storageKey, tabName); } catch (e) {}
        document.querySelectorAll(".observation-tab").forEach(function (t) {
            if (t.getAttribute("data-tab") === tabName) addClass(t, "active"); else removeClass(t, "active");
        });
        var validKeys = getValidTabKeys();
        document.querySelectorAll(".observation-panel").forEach(function (p) {
            var panelKey = p.getAttribute("data-panel");
            if (panelKey === tabName) { show(p); addClass(p, "active"); }
            else if (validKeys.indexOf(panelKey) >= 0) { hide(p); removeClass(p, "active"); }
            else { hide(p); removeClass(p, "active"); }
        });
        if (isDeepLayer) {
            renderPanel(tabName);
        } else {
            if (tabName === "entities") renderPanel("entities");
            if (tabName === "anomalies") renderPanel("anomalies");
            if (tabName === "question") renderPanel("question");
        }
        scrollContentToTop();
    }

    function renderPanel(name) {
        var panel = byId("observation-panel-" + name);
        if (!panel) return;
        if (isDeepLayer && (name === "core" || name === "records" || name === "signal")) {
            renderDeepPanel(name);
            return;
        }
        if (name === "core") renderCore(panel);
        else if (name === "entities") renderEntities(panel);
        else if (name === "anomalies") renderAnomalies(panel);
        else if (name === "question") renderQuestion(panel);
    }

    function renderDeepPanel(name) {
        var panel = byId("observation-panel-" + name);
        if (!panel || !D.deep) return;
        if (name === "core") {
            var traceCore = isTraceMode && normalizedTrace === "core" && D.deep.trace && D.deep.trace.core;
            if (traceCore) {
                var lines = traceCore.lines || [];
                var traceNote = traceCore.note || "";
                var html = '<div class="trace-core">';
                lines.forEach(function (line) {
                    html += '<p class="trace-line">' + escapeHtml(line) + '</p>';
                });
                if (traceNote) html += '<p class="trace-note">' + escapeHtml(traceNote) + '</p>';
                html += '<p class="trace-observer">Observer detected: ' + escapeHtml(observerId || "Unresolved") + '</p>';
                html += '</div>';
                panel.innerHTML = html;
            } else {
                var core = D.deep.core || {};
                var intro = (core.intro || "").replace(/\n/g, "<br>");
                var copy = (core.copy || "").replace(/\n/g, "<br>");
                var note = (core.note || "").replace(/\n/g, "<br>");
                var html = '<article class="obs-intro-card"><h3>' + escapeHtml(core.sectionTitle || "Deep Observation") + '</h3><p class="obs-intro-text">' + intro + '</p>';
                if (copy) html += '<p class="obs-intro-text">' + copy + '</p>';
                if (note) html += '<p class="obs-intro-text">' + note + '</p>';
                var conn = getConnectionState();
                if (conn.points > 0) html += '<p class="obs-connection-line obs-causality-line">Observer resource detected. Causality balance: ' + escapeHtml(String(conn.points)) + '</p>';
                else html += '<p class="obs-connection-line obs-causality-line">Your causality balance remains unstable.</p>';
                html += '</article>';
                panel.innerHTML = html;
            }
        } else if (name === "records") {
            var rec = D.deep.records || {};
            var logs = rec.logs || [];
            var html = '<article class="obs-intro-card"><h3>' + escapeHtml(rec.sectionTitle || "Records") + '</h3></article><div class="anomaly-list">';
            logs.forEach(function (log) {
                html += '<article class="anomaly-item"><button type="button" class="anomaly-item-title">' + escapeHtml((log.code || "") + " " + (log.title || "")) + '</button><div class="anomaly-item-body hidden"><p>' + nl2br(log.body || "") + '</p></div></article>';
            });
            html += '</div>';
            panel.innerHTML = html;
            panel.querySelectorAll(".anomaly-item-title").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var body = btn.nextElementSibling;
                    if (body) body.classList.toggle("hidden");
                });
            });
        } else if (name === "signal") {
            var sig = D.deep.signal || {};
            var lines = sig.lines || [];
            var html = '<article class="obs-intro-card"><h3>' + escapeHtml(sig.sectionTitle || "Signal") + '</h3></article><div class="obs-signal-lines">';
            lines.forEach(function (line) {
                html += '<p class="obs-signal-line">' + escapeHtml(line) + '</p>';
            });
            var conn = getConnectionState();
            if (conn.role === "GUEST") html += '<p class="obs-signal-line obs-connection-line">Unregistered observer detected.</p>';
            else if (conn.role === "CITIZEN") html += '<p class="obs-signal-line obs-connection-line">Citizen observer linked.</p>';
            if (conn.checkinToday) html += '<p class="obs-signal-line obs-connection-line">A wish was recorded earlier today.</p>';
            else html += '<p class="obs-signal-line obs-connection-line">No wish detected today.</p>';
            if (conn.questionAnswer === "white") html += '<p class="obs-signal-line obs-connection-line">A white decision was observed.</p>';
            else if (conn.questionAnswer === "black") html += '<p class="obs-signal-line obs-connection-line">A black decision was observed.</p>';
            else if (conn.questionAnswer === "unknown" || conn.questionAnswer === "undefined") html += '<p class="obs-signal-line obs-connection-line">Undefined choice logged.</p>';
            if (conn.lastScene && conn.lastScene.indexOf("gallery") >= 0) html += '<p class="obs-signal-line obs-connection-line">Recent observation: Gallery.</p>';
            html += '</div>';
            panel.innerHTML = html;
        }
    }

    function renderCore(panel) {
        var core = D.core || {};
        var intro = (core.intro || "").replace(/\n/g, "<br>");
        var tail = (core.tailSentence || "").replace(/\n/g, "<br>");
        if (tail) intro += "<br><br>" + tail;
        var cards = core.cards || [];
        var html = '<article class="obs-intro-card"><h3>' + escapeHtml(core.sectionTitle || "Core Observation") + '</h3><p class="obs-intro-text">' + intro + '</p></article><div class="obs-card-list">';
        cards.forEach(function (c) {
            html += '<article class="obs-card"><h4>' + escapeHtml(c.title) + '</h4><p>' + nl2br(c.body) + '</p></article>';
        });
        html += '</div>';
        panel.innerHTML = html;
    }

    var entityDetailMap = {};

    function renderEntities(panel) {
        var entities = D.entities || {};
        var container = byId("observation-entities-content");
        if (!container) return;
        entityDetailMap = {};
        var intro = (entities.intro || "").replace(/\n/g, "<br>");
        var conn = getConnectionState();
        var html = '<article class="obs-intro-card"><h3>' + escapeHtml(entities.sectionTitle || "Entities") + '</h3><p class="obs-intro-text">' + intro + '</p>';
        if (conn.cards && conn.cards.length > 0) html += '<p class="obs-entities-collection-hint">Observed in your collection.</p>';
        html += '</article><div class="entity-groups">';
        (entities.groups || []).forEach(function (grp) {
            var desc = (grp.groupDesc || "").replace(/\n/g, "<br>");
            html += '<section class="entity-group"><h4 class="entity-group-title">' + escapeHtml(grp.name) + '</h4>';
            if (desc) html += '<p class="entity-group-desc">' + desc + '</p>';
            html += '<div class="entity-grid">';
            (grp.items || []).forEach(function (e) {
                if (e.conditional) {
                    if (visitCount < 2) return;
                    if (Math.random() < 0.5) return;
                }
                entityDetailMap[e.id] = e;
                var cardClass = "entity-card";
                if (e.moelCard) cardClass += " moel-card";
                if (e.noaCard) cardClass += " noa-card";
                html += '<article class="' + cardClass + '" data-entity-id="' + escapeHtml(e.id) + '">';
                html += '<h5>' + escapeHtml(e.name) + '</h5><p class="entity-tagline">' + escapeHtml(e.tagline || "") + '</p></article>';
            });
            html += '</div></section>';
        });
        html += '</div>';
        container.innerHTML = html;

        var detailPanel = byId("entity-detail-panel");
        container.querySelectorAll(".entity-card").forEach(function (card) {
            card.addEventListener("click", function () {
                var id = card.getAttribute("data-entity-id") || "";
                var e = entityDetailMap[id];
                var name = e ? e.name : "";
                var tagline = e ? (e.tagline || "") : "";
                var detail = e ? (e.detail || "") : "";
                var noaBlank = false;
                if (e && e.noaCard && Math.random() < 0.4) {
                    var variants = D.noaBlankVariants || ["She said she drew them.\nBut the page remains blank."];
                    detail = (variants[Math.floor(Math.random() * variants.length)] || "").split("\n")[0];
                    noaBlank = true;
                }
                if (!detailPanel) return;
                detailPanel.querySelector("h4").textContent = name || "Select an entity";
                var bodyHtml = (tagline ? "<em>" + escapeHtml(tagline) + "</em><br><br>" : "") + nl2br(detail);
                if (noaBlank && (D.noaUnavailableLabel || "")) bodyHtml += "<br><span class=\"entity-detail-unavailable\">" + escapeHtml(D.noaUnavailableLabel) + "</span>";
                detailPanel.querySelector("p").innerHTML = bodyHtml;
            });
        });
    }

    function renderAnomalies(panel) {
        var anomalies = D.anomalies || {};
        var intro = (anomalies.intro || "").replace(/\n/g, "<br>");
        var logs = anomalies.logs || [];
        var html = '<article class="obs-intro-card"><h3>' + escapeHtml(anomalies.sectionTitle || "Anomaly Logs") + '</h3><p class="obs-intro-text">' + intro + '</p></article><div class="anomaly-list">';
        logs.forEach(function (log) {
            var titleText = (log.code ? log.code + " " : "") + (log.title || "");
            html += '<article class="anomaly-item" data-log="' + escapeHtml(log.id) + '"><button type="button" class="anomaly-item-title">' + escapeHtml(titleText) + '</button><div class="anomaly-item-body hidden"><p>' + nl2br(log.body) + '</p></div></article>';
        });
        html += '</div>';
        panel.innerHTML = html;
        panel.querySelectorAll(".anomaly-item-title").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var item = btn.closest(".anomaly-item");
                var body = item ? item.querySelector(".anomaly-item-body") : null;
                if (!body) return;
                var logId = item ? item.getAttribute("data-log") : "";
                var isNoaDiary = logId === "noa-diary";
                var p = body.querySelector("p");
                if (isNoaDiary && p && Math.random() < 0.2) {
                    var originalHtml = p.innerHTML;
                    var variants = D.noaBlankVariants || ["She said she drew them.\nBut the page remains blank."];
                    p.innerHTML = nl2br(variants[Math.floor(Math.random() * variants.length)] || "");
                    body.classList.remove("hidden");
                    setTimeout(function () {
                        p.innerHTML = originalHtml;
                    }, 2500);
                    return;
                }
                body.classList.toggle("hidden");
            });
        });
    }

    function renderQuestion(panel) {
        var q = D.question || {};
        var opts = q.options || [];
        var lastAnswer = "";
        try { lastAnswer = localStorage.getItem(QUESTION_ANSWER_KEY) || ""; } catch (e) {}
        var lastLabel = lastAnswer ? (opts.filter(function (o) { return o.value === lastAnswer; })[0] || {}).label : "";
        var html = '<div class="question-card"><h3>' + escapeHtml(q.sectionTitle || "The Question") + '</h3>';
        html += '<p class="question-line">' + escapeHtml(q.questionLine || "你和我所选择的未来？") + '</p>';
        html += '<p class="question-copy">' + nl2br(q.copy || "") + '</p>';
        if (lastLabel) html += '<p class="question-last-answer">Last recorded answer: ' + escapeHtml(lastLabel) + '</p>';
        html += '<div class="question-actions">';
        opts.forEach(function (o) {
            var sel = o.value === lastAnswer ? " selected" : "";
            html += '<button type="button" class="question-opt' + sel + '" data-answer="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</button>';
        });
        html += '</div><p class="question-note">' + escapeHtml(q.note || "") + '</p></div>';
        panel.innerHTML = html;
        panel.querySelectorAll(".question-opt").forEach(function (btn) {
            btn.addEventListener("click", function () {
                panel.querySelectorAll(".question-opt").forEach(function (b) { removeClass(b, "selected"); });
                addClass(btn, "selected");
                try { localStorage.setItem(QUESTION_ANSWER_KEY, btn.getAttribute("data-answer") || ""); } catch (e) {}
            });
        });
    }

    function fillEntry() {
        var entry = isDeepLayer && D.deep && D.deep.entry ? D.deep.entry : (D.entry || {});
        var leadEl = byId("entry-lead");
        var copyEl = byId("entry-copy");
        var noteEl = byId("entry-note");
        if (leadEl) leadEl.innerHTML = nl2br(entry.lead || "");
        if (copyEl) copyEl.innerHTML = nl2br(entry.copy || "");
        if (noteEl) noteEl.textContent = entry.note || "";
        var openBtn = byId("observation-open-btn");
        var returnBtn = byId("observation-return-btn");
        if (openBtn && entry.btnOpen) openBtn.textContent = entry.btnOpen;
        if (returnBtn && entry.btnReturn) returnBtn.textContent = entry.btnReturn;
    }

    function fillHeader() {
        var kickerEl = byId("observation-kicker");
        var titleEl = byId("observation-title");
        if (isTraceMode && D.deep && D.deep.trace && D.deep.trace[normalizedTrace]) {
            if (kickerEl) kickerEl.textContent = D.deep.headerKicker || "Deep Observation Layer";
            if (titleEl) titleEl.textContent = D.deep.trace[normalizedTrace].title || "Trace Mode";
        } else if (isDeepLayer && D.deep) {
            if (kickerEl) kickerEl.textContent = D.deep.headerKicker || "Deep Observation Layer";
            if (titleEl) titleEl.textContent = D.deep.headerTitle || "Some records were not meant to surface this early.";
        } else {
            if (kickerEl) kickerEl.textContent = "Mirror Interface";
            if (titleEl) titleEl.textContent = (D.entry && D.entry.title) ? D.entry.title : "你和我所选择的未来？";
        }
    }

    function buildTabs() {
        var nav = byId("observation-tabs");
        if (!nav) return;
        nav.innerHTML = "";
        var tabs = getTabsForCurrentLayer();
        var storageKey = isDeepLayer ? DEEP_LAST_TAB_KEY : LAST_TAB_KEY;
        var lastTab = "";
        try { lastTab = localStorage.getItem(storageKey) || ""; } catch (e) {}
        var validKeys = getValidTabKeys();
        var firstKey = validKeys[0] || "core";
        if (isTraceMode && traceToTabMap[normalizedTrace]) {
            var traceTab = traceToTabMap[normalizedTrace];
            firstKey = validKeys.indexOf(traceTab) >= 0 ? traceTab : firstKey;
        } else if (validKeys.indexOf(lastTab) >= 0) {
            firstKey = lastTab;
        }
        tabs.forEach(function (t) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "observation-tab" + (t.key === firstKey ? " active" : "");
            btn.setAttribute("data-tab", t.key);
            btn.textContent = t.label;
            btn.addEventListener("click", function () { switchTab(t.key); });
            nav.appendChild(btn);
        });
        document.querySelectorAll(".observation-panel").forEach(function (p) {
            var panelKey = p.getAttribute("data-panel");
            if (validKeys.indexOf(panelKey) >= 0) {
                if (panelKey === firstKey) { show(p); addClass(p, "active"); } else { hide(p); removeClass(p, "active"); }
            } else {
                hide(p);
                removeClass(p, "active");
            }
        });
        renderPanel(firstKey);
    }

    function triggerGodkill() {
        if (godkillLock) return;
        var overlay = byId("observation-godkill-overlay");
        var textEl = overlay ? overlay.querySelector(".observation-godkill-text") : null;
        if (!overlay) return;
        godkillLock = true;
        var count = 1;
        try {
            count = parseInt(localStorage.getItem(GODKILL_COUNT_KEY), 10) || 0;
            count += 1;
            localStorage.setItem(GODKILL_COUNT_KEY, String(count));
        } catch (e) {}
        var msgMap = D.godkillMessages || {};
        var msg = msgMap[count] || msgMap[1] || "Access Denied.";
        if (textEl) textEl.textContent = msg;
        removeClass(overlay, "hidden");
        setTimeout(function () {
            addClass(overlay, "hidden");
            godkillLock = false;
        }, 800);
    }

    function onKeyDown(e) {
        var key = (e.key || "").toUpperCase();
        godkillBuffer = (godkillBuffer + key).slice(-8);
        if (godkillBuffer === "GOD_KILL") { godkillBuffer = ""; triggerGodkill(); }
    }

    function showMoelFlash() {
        var wrap = byId("observation-moel-flash");
        var lineEl = byId("observation-moel-line");
        if (!wrap) return;
        var lines = D.moelLines || ["……"];
        if (lineEl) { lineEl.textContent = lines[Math.floor(Math.random() * lines.length)]; show(lineEl); }
        addClass(wrap, "observation-moel-visible");
        removeClass(wrap, "hidden");
        setTimeout(function () {
            addClass(wrap, "hidden");
            removeClass(wrap, "observation-moel-visible");
        }, 3000);
    }

    function scheduleMoelFlash() {
        if (moelFlashTimer) clearTimeout(moelFlashTimer);
        moelFlashTimer = setTimeout(function () {
            if (Math.random() < 0.35) showMoelFlash();
            moelFlashTimer = null;
        }, 8000 + Math.random() * 12000);
    }

    function maybeShowDeepSentence() {
        if (deepSentenceTimer || Math.random() > 0.4) return;
        var sentences = D.deepSentences || [];
        if (sentences.length === 0) return;
        var el = byId("observation-deep-sentence");
        var textEl = byId("observation-deep-sentence-text");
        if (!el || !textEl) return;
        textEl.textContent = sentences[Math.floor(Math.random() * sentences.length)];
        removeClass(el, "hidden");
        deepSentenceTimer = setTimeout(function () { addClass(el, "hidden"); deepSentenceTimer = null; }, 2500);
    }

    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (y > lastScrollY + 200) { scheduleMoelFlash(); lastScrollY = y; }
    }

    function showVisitPrompt() {
        var el = byId("observation-deep-sentence");
        var textEl = byId("observation-deep-sentence-text");
        if (!el || !textEl) return;
        textEl.textContent = visitCount === 1 ? (D.firstVisitPrompt || "Observation interface activated.") : (D.returnVisitPrompt || "You came back.");
        removeClass(el, "hidden");
        setTimeout(function () { addClass(el, "hidden"); }, 2800);
    }

    function init() {
        if (window.__observationInitialized) return;
        window.__observationInitialized = true;
        var fallback = byId("observation-data-fallback");
        var shell = document.querySelector(".observation-shell");
        var dataOk = isDeepLayer ? (D.deep && (D.deep.entry || (normalizedTrace && D.deep.trace && D.deep.trace[normalizedTrace]))) : D.entry;
        if (!dataOk) {
            try { console.error("OBSERVATION_DATA missing"); } catch (e) {}
            if (fallback) { removeClass(fallback, "hidden"); }
            if (shell) shell.style.display = "none";
            return;
        }
        if (isDeepLayer) document.body.classList.add("deep-layer");
        if (isTraceMode) document.body.classList.add("trace-mode");
        try {
            var stored = parseInt(localStorage.getItem(VISIT_STORAGE_KEY), 10) || 0;
            visitCount = stored + 1;
            localStorage.setItem(VISIT_STORAGE_KEY, String(visitCount));
        } catch (e) {
            visitCount = 1;
        }
        if (hasObserver) {
            try { localStorage.setItem(LAST_OBSERVER_KEY, observerId); } catch (e) {}
        }
        fillHeader();
        if (isTraceMode) {
            hide(byId("observation-entry"));
            var body = byId("observation-body");
            if (body) { removeClass(body, "hidden"); addClass(body, "observation-body-enter"); }
            if (shell) addClass(shell, "observation-body-visible");
            buildTabs();
            var traceHint = byId("observation-trace-hint");
            if (traceHint) show(traceHint);
        } else {
            fillEntry();
            showVisitPrompt();
            buildTabs();
        }
        var openBtn = byId("observation-open-btn");
        if (openBtn) openBtn.addEventListener("click", showBody);

        var returnMirror = byId("observation-return-mirror");
        if (returnMirror) {
            if (isDeepLayer) show(returnMirror); else hide(returnMirror);
        }
        var observerBox = byId("observation-observer");
        if (observerBox) {
            if (hasObserver) {
                show(observerBox);
                observerBox.textContent = "Observer: " + observerId;
            } else {
                hide(observerBox);
            }
        }
        var observerRoleBox = byId("observation-observer-role");
        if (observerRoleBox) {
            if (mainSiteState && mainSiteState.role) {
                show(observerRoleBox);
                observerRoleBox.textContent = mainSiteState.role === "CITIZEN" ? "Observer Role: Citizen" : "Visitor access detected.";
            } else {
                hide(observerRoleBox);
            }
        }

        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", onScroll, { passive: true });
        if (visitCount >= 2 && !isDeepLayer) setTimeout(scheduleMoelFlash, 5000);

        var moelWrap = byId("observation-moel-flash");
        if (moelWrap) moelWrap.addEventListener("click", function () {
            addClass(moelWrap, "hidden");
            removeClass(moelWrap, "observation-moel-visible");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
