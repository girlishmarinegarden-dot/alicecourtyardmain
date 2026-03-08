/**
 * AliceCore 粒子系统（aliceui.txt）
 * scan → gather → align → decay，形成残缺文字循环。仅 observation 入口页使用。
 */
(function () {
    "use strict";

    var PARTICLE_COUNT = 20;
    var MAX_PARTICLES = 24;
    var MIN_PARTICLES = 12;
    var FIELD_HEIGHT = 200;
    var MAX_WIDTH = 400;
    var SCAN_SPEED = 0.3;
    var GATHER_LERP = 0.02;
    var DECAY_LERP = 0.012;
    var STATE_SCAN = 0;
    var STATE_GATHER = 1;
    var STATE_ALIGN = 2;
    var STATE_DECAY = 3;
    var PHASE_DURATION = { scan: 180, gather: 120, align: 150, decay: 150 };

    var COLOR_PALETTE = ["#8FB2FF", "#A6FFD8", "#C8A8FF", "#6C7D9E", "#FF9CA3"];
    var COLOR_WEIGHTS = [0.5, 0.25, 0.15, 0.08, 0.02];
    var RED_INDEX = 4;
    var GRAY_INDEX = 3;
    var TYPE_NODE = 0;
    var TYPE_FRAGMENT = 1;
    var TYPE_NOISE = 2;
    var TYPE_RATIOS = [0.5, 0.3, 0.2];

    var VISIT_COUNT_KEY = "AliceGarden_Observation_VisitCount";
    var USER_STATE_KEY = "AliceGarden_User_State";
    var FRAGMENTED_TARGETS = {
        "U": [{ x: 0, y: 0 }],
        "CORE": [{ x: -0.32, y: -0.12 }, { x: -0.1, y: 0.08 }, { x: 0.12, y: -0.08 }, { x: 0.32, y: 0.12 }],
        "?": [{ x: 0, y: 0 }]
    };

    function getVisitCount() {
        try {
            var n = parseInt(localStorage.getItem(VISIT_COUNT_KEY), 10);
            return (n >= 1 && n <= 9999) ? n : 1;
        } catch (e) {
            return 1;
        }
    }

    function getUidNumeric() {
        try {
            var raw = localStorage.getItem(USER_STATE_KEY);
            var user = raw ? JSON.parse(raw) : null;
            var uid = (user && user.uid) ? String(user.uid) : "";
            if (!uid) return "0000";
            var digits = uid.replace(/\D/g, "");
            return digits.length > 0 ? digits.slice(0, 6) : "0000";
        } catch (e) {
            return "0000";
        }
    }

    function getWordSequence() {
        return [
            String(getVisitCount()),
            "U",
            getUidNumeric(),
            "CORE",
            "?"
        ];
    }

    function targetsForDigitCount(n) {
        if (n <= 0) return [{ x: 0, y: 0 }];
        if (n === 1) return [{ x: 0, y: 0 }];
        if (n === 2) return [{ x: -0.22, y: 0 }, { x: 0.22, y: 0 }];
        if (n === 3) return [{ x: -0.28, y: -0.05 }, { x: 0, y: 0.06 }, { x: 0.28, y: -0.05 }];
        if (n === 4) return [{ x: -0.38, y: -0.05 }, { x: -0.13, y: 0.02 }, { x: 0.13, y: -0.02 }, { x: 0.38, y: 0.05 }];
        var out = [];
        for (var i = 0; i < n; i++) {
            var t = (i / (n - 1)) * 2 - 1;
            var yOff = (i % 3 === 1) ? 0.04 : ((i % 3 === 0) ? -0.03 : 0.02);
            out.push({ x: t * 0.38, y: yOff });
        }
        return out;
    }

    function getTargetsForWord(word) {
        if (FRAGMENTED_TARGETS[word]) return FRAGMENTED_TARGETS[word];
        if (/^\d+$/.test(word)) return targetsForDigitCount(word.length);
        return [{ x: 0, y: 0 }];
    }

    var canvas, ctx, w, h, cx, cy;
    var particles = [];
    var state = STATE_SCAN;
    var stateFrame = 0;
    var wordIndex = 0;
    var cachedWordSequence = [];
    var currentTargets = [];
    var decayTargets = [];
    var animId = null;
    var isDeep = false;

    function pickColorByRatio(index) {
        var n = index / PARTICLE_COUNT;
        var acc = 0;
        for (var i = 0; i < COLOR_WEIGHTS.length; i++) {
            acc += COLOR_WEIGHTS[i];
            if (n <= acc) return i;
        }
        return 0;
    }

    function pickType(index) {
        var n = index / PARTICLE_COUNT;
        if (n < TYPE_RATIOS[0]) return TYPE_NODE;
        if (n < TYPE_RATIOS[0] + TYPE_RATIOS[1]) return TYPE_FRAGMENT;
        return TYPE_NOISE;
    }

    function randomIn(min, max) {
        return min + Math.random() * (max - min);
    }

    function initParticles() {
        var deep = document.body.classList.contains("deep-layer") || document.body.classList.contains("trace-mode");
        var maxRed = deep ? 2 : 1;
        var colorIndices = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) colorIndices.push(pickColorByRatio(i));
        var redCount = 0;
        for (var j = 0; j < colorIndices.length; j++) {
            if (colorIndices[j] === RED_INDEX) {
                redCount++;
                if (redCount > maxRed) colorIndices[j] = GRAY_INDEX;
            }
        }
        particles = [];
        for (var k = 0; k < PARTICLE_COUNT; k++) {
            particles.push({
                type: pickType(k),
                color: COLOR_PALETTE[colorIndices[k]],
                x: randomIn(0, w),
                y: randomIn(0, h),
                vx: 0,
                vy: 0,
                delay: Math.floor(randomIn(0, 90)),
                delayLeft: Math.floor(randomIn(0, 90)),
                targetX: 0,
                targetY: 0
            });
        }
    }

    function setTargetsFromWord() {
        if (wordIndex === 0 || cachedWordSequence.length === 0) {
            cachedWordSequence = getWordSequence();
        }
        var word = cachedWordSequence[wordIndex];
        currentTargets = getTargetsForWord(word);
        var n = currentTargets.length;
        var scale = Math.min(w, h) * 0.45;
        for (var i = 0; i < particles.length; i++) {
            var t = currentTargets[i % n];
            particles[i].targetX = cx + t.x * scale;
            particles[i].targetY = cy + t.y * scale;
        }
    }

    function setDecayTargets() {
        for (var i = 0; i < particles.length; i++) {
            decayTargets[i] = {
                x: randomIn(0, w),
                y: randomIn(0, h)
            };
        }
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function dist(ax, ay, bx, by) {
        return Math.hypot(bx - ax, by - ay);
    }

    function update() {
        stateFrame++;
        var lerpRate = isDeep ? GATHER_LERP * 0.6 : GATHER_LERP;
        var decayRate = isDeep ? DECAY_LERP * 0.6 : DECAY_LERP;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            if (p.delayLeft > 0) {
                p.delayLeft--;
                continue;
            }
            if (state === STATE_SCAN) {
                p.vx += (Math.random() - 0.5) * 0.4;
                p.vy += (Math.random() - 0.5) * 0.4;
                p.vx *= 0.98;
                p.vy *= 0.98;
                var speed = isDeep ? SCAN_SPEED * 0.6 : SCAN_SPEED;
                p.x += p.vx * speed;
                p.y += p.vy * speed;
                p.x = Math.max(0, Math.min(w, p.x));
                p.y = Math.max(0, Math.min(h, p.y));
            } else if (state === STATE_GATHER) {
                p.x = lerp(p.x, p.targetX, lerpRate);
                p.y = lerp(p.y, p.targetY, lerpRate);
            } else if (state === STATE_ALIGN) {
                p.x = lerp(p.x, p.targetX, 0.02);
                p.y = lerp(p.y, p.targetY, 0.02);
            } else if (state === STATE_DECAY) {
                var dt = decayTargets[i];
                if (dt) {
                    p.x = lerp(p.x, dt.x, decayRate);
                    p.y = lerp(p.y, dt.y, decayRate);
                }
            }
        }

        if (state === STATE_SCAN && stateFrame >= PHASE_DURATION.scan) {
            state = STATE_GATHER;
            stateFrame = 0;
            setTargetsFromWord();
        } else if (state === STATE_GATHER && stateFrame >= PHASE_DURATION.gather) {
            state = STATE_ALIGN;
            stateFrame = 0;
        } else if (state === STATE_ALIGN && stateFrame >= PHASE_DURATION.align) {
            state = STATE_DECAY;
            stateFrame = 0;
            setDecayTargets();
        } else if (state === STATE_DECAY && stateFrame >= PHASE_DURATION.decay) {
            state = STATE_SCAN;
            stateFrame = 0;
            var len = cachedWordSequence.length || 5;
            wordIndex = (wordIndex + 1) % len;
            if (wordIndex === 0) {
                cachedWordSequence = getWordSequence();
            }
        }
    }

    function hexToRgb(hex) {
        var m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [140, 178, 255];
    }

    function draw() {
        if (!ctx || !w || !h) return;
        ctx.clearRect(0, 0, w, h);
        var glow = isDeep ? "rgba(100,120,160,0.4)" : "rgba(140,180,255,0.6)";
        var glowStrong = isDeep ? "rgba(160,200,255,0.35)" : "rgba(180,220,255,0.5)";

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var x = Math.round(p.x);
            var y = Math.round(p.y);
            ctx.fillStyle = p.color;
            if (p.type === TYPE_NODE) {
                var s = 4;
                ctx.shadowColor = glow;
                ctx.shadowBlur = 4;
                ctx.fillRect(x - s, y - s, 8, 8);
            } else if (p.type === TYPE_FRAGMENT) {
                var sw = 5;
                var sh = 2;
                ctx.shadowColor = glowStrong;
                ctx.shadowBlur = 6;
                ctx.fillRect(x - sw, y - sh, 10, 4);
            } else {
                ctx.shadowColor = glow;
                ctx.shadowBlur = 2;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    }

    function tick() {
        try {
            update();
            draw();
        } catch (e) {}
        animId = requestAnimationFrame(tick);
    }

    function resize() {
        try {
            var container = document.getElementById("observation-particle-field");
            if (!container) return;
            canvas = document.getElementById("observation-particle-canvas");
            if (!canvas) return;
            var rect = container.getBoundingClientRect();
            w = Math.min(rect.width, MAX_WIDTH);
            h = FIELD_HEIGHT;
            canvas.width = w;
            canvas.height = h;
            cx = w / 2;
            cy = h / 2;
            ctx = canvas.getContext("2d");
            if (!ctx) return;
            isDeep = document.body.classList.contains("deep-layer") || document.body.classList.contains("trace-mode");
            initParticles();
            setDecayTargets();
            state = STATE_SCAN;
            stateFrame = 0;
            wordIndex = 0;
            cachedWordSequence = getWordSequence();
        } catch (e) {}
    }

    function isEntryVisible() {
        var entry = document.getElementById("observation-entry");
        return entry && !entry.classList.contains("hidden");
    }

    function start() {
        if (!isEntryVisible()) return;
        resize();
        if (animId) cancelAnimationFrame(animId);
        tick();
    }

    function stop() {
        if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
        }
    }

    function init() {
        var field = document.getElementById("observation-particle-field");
        if (!field) return;
        var entry = document.getElementById("observation-entry");
        if (entry && entry.classList.contains("hidden")) {
            resize();
            window.addEventListener("resize", function () { resize(); });
            document.addEventListener("visibilitychange", onVisibilityChange);
            return;
        }
        resize();
        start();
        window.addEventListener("resize", function () { resize(); });
        document.addEventListener("visibilitychange", onVisibilityChange);
        if (entry) {
            var obs = new MutationObserver(function () {
                if (entry.classList.contains("hidden")) stop();
            });
            obs.observe(entry, { attributes: true, attributeFilter: ["class"] });
        }
    }

    function onVisibilityChange() {
        if (document.hidden) {
            stop();
        } else {
            if (isEntryVisible()) start();
        }
    }

    function run() {
        try {
            init();
        } catch (e) {}
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", run);
    } else {
        run();
    }
})();
