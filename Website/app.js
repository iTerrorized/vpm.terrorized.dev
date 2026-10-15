(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Background particles ---------- */

    function startBackground() {
        var canvas = document.getElementById('canvas');
        if (!canvas || reduceMotion) return;

        var ctx = canvas.getContext('2d');
        var width = 0;
        var height = 0;
        var particles = [];
        var tabActive = true;
        var mouse = { x: null, y: null, radius: 150 };

        function Particle() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.baseX = this.x;
            this.baseY = this.y;
            this.angle = Math.random() * Math.PI * 2;
            this.angleSpeed = (Math.random() - 0.5) * 0.01;
            this.wanderRadius = Math.random() * 40 + 15;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.radius = Math.random() * 2 + 1;
        }

        Particle.prototype.update = function () {
            this.angle += this.angleSpeed;
            var homeX = this.baseX + Math.cos(this.angle) * this.wanderRadius;
            var homeY = this.baseY + Math.sin(this.angle) * this.wanderRadius;

            this.vx += (homeX - this.x) * 0.002;
            this.vy += (homeY - this.y) * 0.002;

            if (mouse.x != null && mouse.y != null) {
                var dx = mouse.x - this.x;
                var dy = mouse.y - this.y;
                if (Math.sqrt(dx * dx + dy * dy) < 200) {
                    this.vx += dx * 0.001;
                    this.vy += dy * 0.001;
                }
            }

            this.vx *= 0.95;
            this.vy *= 0.95;
            this.x += this.vx;
            this.y += this.vy;
        };

        Particle.prototype.draw = function () {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
        };

        function seed() {
            particles = [];
            var count = Math.min((width * height) / 8000, 400);
            for (var i = 0; i < count; i++) particles.push(new Particle());
        }

        function resize() {
            // clientWidth, not innerWidth: innerWidth includes the scrollbar and
            // would make the canvas overhang the viewport.
            width = canvas.width = document.documentElement.clientWidth;
            height = canvas.height = document.documentElement.clientHeight;
            seed();
        }

        function frame() {
            requestAnimationFrame(frame);
            if (!tabActive) return;

            ctx.clearRect(0, 0, width, height);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.update();
                p.draw();

                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j];
                    var dx = p.x - q.x;
                    var dy = p.y - q.y;
                    if (Math.abs(dx) < 100 && Math.abs(dy) < 100) {
                        var d = Math.sqrt(dx * dx + dy * dy);
                        if (d < 100) {
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - d / 100) + ')';
                            ctx.lineWidth = 0.5;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(q.x, q.y);
                            ctx.stroke();
                        }
                    }
                }

                if (mouse.x != null && mouse.y != null) {
                    var mx = p.x - mouse.x;
                    var my = p.y - mouse.y;
                    if (Math.abs(mx) < mouse.radius && Math.abs(my) < mouse.radius) {
                        var md = Math.sqrt(mx * mx + my * my);
                        if (md < mouse.radius) {
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - md / mouse.radius) + ')';
                            ctx.lineWidth = 1;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(mouse.x, mouse.y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 200);
        });
        window.addEventListener('mousemove', function (e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', function () {
            mouse.x = null;
            mouse.y = null;
        });
        document.addEventListener('visibilitychange', function () {
            tabActive = !document.hidden;
        });

        resize();
        frame();
    }

    /* ---------- Tooltips ---------- */

    function startTooltips() {
        var tip = document.getElementById('tooltip');
        if (!tip) return;

        function show(target) {
            var text = target.getAttribute('data-tip');
            if (!text) return;
            tip.textContent = text;
            tip.classList.add('visible');
            var r = target.getBoundingClientRect();
            var x = r.left + r.width / 2;
            var half = tip.offsetWidth / 2;
            if (x - half < 8) x = half + 8;
            if (x + half > window.innerWidth - 8) x = window.innerWidth - half - 8;
            tip.style.left = x + 'px';
            tip.style.top = r.top + 'px';
        }

        function hide() {
            tip.classList.remove('visible');
        }

        function bind(event, handler) {
            document.addEventListener(event, function (e) {
                var target = e.target.closest ? e.target.closest('[data-tip]') : null;
                if (target) handler(target);
                else if (handler === show) hide();
            }, true);
        }

        bind('mouseover', show);
        bind('focusin', show);
        document.addEventListener('mouseout', hide, true);
        document.addEventListener('focusout', hide, true);
        window.addEventListener('scroll', hide, true);
        document.addEventListener('click', hide, true);
    }

    /* ---------- Toast ---------- */

    var toastTimer;

    function toast(message, isError) {
        var el = document.getElementById('toast');
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', !!isError);
        el.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('visible');
        }, 1800);
    }

    /* ---------- Clipboard ---------- */

    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var scratch = document.createElement('textarea');
            scratch.value = text;
            scratch.setAttribute('readonly', '');
            scratch.style.position = 'fixed';
            scratch.style.top = '-1000px';
            document.body.appendChild(scratch);
            scratch.select();
            var ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (err) {
                ok = false;
            }
            document.body.removeChild(scratch);
            if (ok) resolve();
            else reject(new Error('copy failed'));
        });
    }

    /* ---------- Listing URL / VCC handoff ---------- */

    function listingUrl() {
        var field = document.getElementById('vccUrl');
        return field ? field.value.trim() : '';
    }

    // The Add to VCC controls are plain links, so they keep working without JS
    // and support right-click / copy-link. All we do here is fill in the href.
    function wireVccLinks() {
        var url = listingUrl();
        var links = document.querySelectorAll('.js-add-vcc');
        if (!url) return;

        var deepLink = 'vcc://vpm/addRepo?url=' + encodeURIComponent(url);
        for (var i = 0; i < links.length; i++) {
            links[i].setAttribute('href', deepLink);
        }
    }

    /* ---------- Modals ---------- */

    var lastFocus = null;

    function openModal(el) {
        lastFocus = document.activeElement;
        el.hidden = false;
        var focusable = el.querySelector('.js-close');
        if (focusable) focusable.focus();
    }

    function closeModal(el) {
        el.hidden = true;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        lastFocus = null;
    }

    function closeAllModals() {
        var open = document.querySelectorAll('.overlay:not([hidden])');
        for (var i = 0; i < open.length; i++) closeModal(open[i]);
    }

    /* ---------- Package info ---------- */

    function fillInfo(row) {
        var details = row.querySelector('.pkg-details');
        var nameEl = row.querySelector('.pkg-name');
        var descEl = row.querySelector('.pkg-desc');
        var zipEl = row.querySelector('.js-zip');

        var version = details ? details.querySelector('.d-version') : null;
        var author = details ? details.querySelector('.d-author') : null;
        var license = details ? details.querySelector('.d-license') : null;
        var deps = details ? details.querySelectorAll('.d-deps li') : [];
        var keywords = details ? details.querySelectorAll('.d-keywords li') : [];

        document.getElementById('infoName').textContent = nameEl ? nameEl.textContent.trim() : '';
        document.getElementById('infoId').textContent = row.getAttribute('data-id') || '';

        var versionText = version ? version.textContent.trim() : '';
        var versionEl = document.getElementById('infoVersion');
        versionEl.textContent = versionText ? 'v' + versionText : '';
        versionEl.hidden = !versionText;

        var descText = descEl ? descEl.textContent.trim() : '';
        document.getElementById('infoDescription').textContent = descText || 'No description provided.';

        var authorName = author ? author.textContent.trim() : '';
        var authorUrl = author ? (author.getAttribute('data-url') || '') : '';
        var authorBlock = document.getElementById('infoAuthorBlock');
        var authorLink = document.getElementById('infoAuthor');
        authorBlock.hidden = !authorName;
        if (authorName) {
            authorLink.textContent = authorName;
            if (authorUrl) {
                authorLink.href = authorUrl;
            } else {
                authorLink.removeAttribute('href');
            }
        }

        var depsBlock = document.getElementById('infoDepsBlock');
        var depsList = document.getElementById('infoDeps');
        depsList.textContent = '';
        depsBlock.hidden = deps.length === 0;
        for (var i = 0; i < deps.length; i++) {
            depsList.appendChild(deps[i].cloneNode(true));
        }

        var keywordsBlock = document.getElementById('infoKeywordsBlock');
        var keywordsWrap = document.getElementById('infoKeywords');
        keywordsWrap.textContent = '';
        keywordsBlock.hidden = keywords.length === 0;
        for (var k = 0; k < keywords.length; k++) {
            var chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = keywords[k].textContent.trim();
            keywordsWrap.appendChild(chip);
        }

        var licenseName = license ? license.textContent.trim() : '';
        var licenseUrl = license ? (license.getAttribute('data-url') || '') : '';
        var licenseBlock = document.getElementById('infoLicenseBlock');
        var licenseEl = document.getElementById('infoLicense');
        licenseBlock.hidden = !licenseName && !licenseUrl;
        if (!licenseBlock.hidden) {
            licenseEl.textContent = '';
            if (licenseUrl) {
                var link = document.createElement('a');
                link.href = licenseUrl;
                link.target = '_blank';
                link.rel = 'noopener';
                link.textContent = licenseName || 'View license';
                licenseEl.appendChild(link);
            } else {
                licenseEl.textContent = licenseName;
            }
        }

        var zipUrl = zipEl ? zipEl.getAttribute('href') : '';
        var infoZip = document.getElementById('infoZip');
        if (zipUrl) {
            infoZip.href = zipUrl;
            infoZip.hidden = false;
        } else {
            infoZip.hidden = true;
        }
    }

    /* ---------- Search ---------- */

    function startSearch() {
        var input = document.getElementById('searchInput');
        var list = document.getElementById('pkgList');
        var empty = document.getElementById('emptyState');
        if (!input || !list) return;

        var rows = list.querySelectorAll('.pkg');

        input.addEventListener('input', function () {
            var term = input.value.trim().toLowerCase();
            var shown = 0;

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var match = true;

                if (term) {
                    var name = (row.getAttribute('data-name') || '').toLowerCase();
                    var id = (row.getAttribute('data-id') || '').toLowerCase();
                    var descEl = row.querySelector('.pkg-desc');
                    var desc = descEl ? descEl.textContent.toLowerCase() : '';
                    match = name.indexOf(term) !== -1 || id.indexOf(term) !== -1 || desc.indexOf(term) !== -1;
                }

                row.hidden = !match;
                if (match) shown++;
            }

            if (empty) empty.hidden = shown !== 0;
        });
    }

    /* ---------- Wire up ---------- */

    function start() {
        startBackground();
        startTooltips();
        startSearch();
        wireVccLinks();

        var helpModal = document.getElementById('helpModal');
        var infoModal = document.getElementById('infoModal');

        var helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', function () {
                openModal(helpModal);
            });
        }

        document.addEventListener('click', function (e) {
            if (!e.target.closest) return;

            var copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) {
                var field = document.getElementById(copyBtn.getAttribute('data-copy'));
                var value = field ? field.value : '';
                if (field) field.select();
                copyText(value).then(function () {
                    toast('Copied');
                }).catch(function () {
                    toast('Could not copy, select it by hand', true);
                });
                return;
            }

            var addBtn = e.target.closest('.js-add-vcc');
            if (addBtn && !addBtn.getAttribute('href')) {
                e.preventDefault();
                toast('Listing URL is missing', true);
                return;
            }

            var infoBtn = e.target.closest('.js-info');
            if (infoBtn) {
                var row = infoBtn.closest('.pkg');
                if (row) {
                    fillInfo(row);
                    openModal(infoModal);
                }
                return;
            }

            var closeBtn = e.target.closest('.js-close');
            if (closeBtn) {
                var owner = closeBtn.closest('.overlay');
                if (owner) closeModal(owner);
                return;
            }

            if (e.target.classList && e.target.classList.contains('overlay')) {
                closeModal(e.target);
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllModals();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
