/**
 * Alice's Garden — Dynamic Celestial Starlight & Floating Petals Canvas
 * Replicates the elegant ambient particle atmosphere of the Fan Art Wallpaper Garden
 */
(function () {
    "use strict";

    var canvas, ctx;
    var particles = [];
    var petals = [];
    var animFrameId;
    var width = 0;
    var height = 0;

    var STAR_COUNT = 36;
    var PETAL_COUNT = 24;

    var COLORS = [
        'rgba(192, 132, 252, ',  // Purple / Lavender
        'rgba(244, 114, 182, ',  // Pink / Rose
        'rgba(56, 189, 248, ',   // Cyan / Sky
        'rgba(251, 191, 36, ',   // Gold / Amber
        'rgba(255, 255, 255, '   // White / Starlight
    ];

    function createParticle() {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.8 + 0.6,
            colorBase: COLORS[Math.floor(Math.random() * COLORS.length)],
            alpha: Math.random() * 0.7 + 0.2,
            alphaSpeed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
        };
    }

    function createPetal() {
        return {
            x: Math.random() * width,
            y: -20 - Math.random() * 100,
            size: Math.random() * 6 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.03,
            vx: Math.random() * 0.6 - 0.1,
            vy: Math.random() * 0.8 + 0.4,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.02 + 0.01,
            color: Math.random() > 0.4 ? 'rgba(244, 114, 182, 0.45)' : 'rgba(216, 180, 254, 0.4)'
        };
    }

    function init() {
        canvas = document.getElementById('celestial-particles-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        if (!ctx) return;

        resize();
        window.addEventListener('resize', resize, { passive: true });

        particles = [];
        for (var i = 0; i < STAR_COUNT; i++) {
            particles.push(createParticle());
        }

        petals = [];
        for (var j = 0; j < PETAL_COUNT; j++) {
            var p = createPetal();
            p.y = Math.random() * height; // Spread across screen initially
            petals.push(p);
        }

        loop();
    }

    function resize() {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function loop() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        // Render Starlight Particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha += p.alphaSpeed;

            if (p.alpha > 0.85 || p.alpha < 0.15) {
                p.alphaSpeed = -p.alphaSpeed;
            }

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.colorBase + Math.max(0.05, Math.min(0.9, p.alpha)) + ')';
            ctx.shadowColor = p.colorBase + '0.6)';
            ctx.shadowBlur = 8;
            ctx.fill();
        }
        ctx.shadowBlur = 0; // Reset shadow for petals

        // Render Falling Petals
        for (var j = 0; j < petals.length; j++) {
            var pt = petals[j];
            pt.sway += pt.swaySpeed;
            pt.x += pt.vx + Math.sin(pt.sway) * 0.5;
            pt.y += pt.vy;
            pt.rotation += pt.rotationSpeed;

            if (pt.y > height + 20 || pt.x > width + 20 || pt.x < -20) {
                petals[j] = createPetal();
            }

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(pt.rotation);
            ctx.beginPath();
            ctx.ellipse(0, 0, pt.size, pt.size * 0.55, Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = pt.color;
            ctx.fill();
            ctx.restore();
        }

        animFrameId = requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
