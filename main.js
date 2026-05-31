// ============================================================
//  VIBPS — THEME SYSTEM
// ============================================================
const THEME_KEY = 'vibps-theme';

function applyTheme(theme, save = true) {
    document.body.classList.remove('theme-elegant', 'theme-interactive');
    document.body.classList.add(theme);
    if (save) localStorage.setItem(THEME_KEY, theme);
    updateSwitcherUI(theme);
    if (theme === 'theme-interactive') initParticles();
    else removeParticles();
}

function updateSwitcherUI(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function initParticles() {
    if (document.querySelector('.cyber-particle')) return;
    const cfg = [
        { l:  8, t: 18, s: 8,  d: 7  }, { l: 78, t: 12, s: 6,  d: 9  },
        { l: 22, t: 65, s: 10, d: 8  }, { l: 62, t: 38, s: 5,  d: 11 },
        { l: 42, t: 82, s: 7,  d: 6  }, { l: 88, t: 58, s: 9,  d: 10 },
        { l: 15, t: 45, s: 5,  d: 13 }, { l: 55, t:  8, s: 6,  d: 7  },
        { l: 35, t: 28, s: 8,  d: 9  }, { l: 72, t: 72, s: 5,  d: 12 },
    ];
    cfg.forEach((c, i) => {
        const p = document.createElement('div');
        p.className = 'cyber-particle';
        const cyan = i % 2 === 0;
        const color = cyan ? 'rgba(0,229,255,0.18)' : 'rgba(180,0,255,0.15)';
        p.style.cssText = `left:${c.l}%;top:${c.t}%;width:${c.s}px;height:${c.s}px;`
            + `background:${color};--pdur:${c.d}s;--pdel:${i * 0.4}s;`
            + `filter:blur(${Math.ceil(c.s / 3)}px)`;
        document.body.appendChild(p);
    });
}

function removeParticles() {
    document.querySelectorAll('.cyber-particle').forEach(p => p.remove());
}

function initThemeSwitcher() {
    const saved = localStorage.getItem(THEME_KEY) || 'theme-interactive';
    applyTheme(saved, false);

    const sw = document.createElement('div');
    sw.id = 'theme-switcher';
    sw.innerHTML = `
        <span class="sw-label">VERSIÓN</span>
        <button class="theme-btn" data-theme="theme-elegant">✦ V1 ELEGANTE</button>
        <span class="sw-sep">|</span>
        <button class="theme-btn" data-theme="theme-interactive">⚡ V2 CYBERPUNK</button>
    `;
    document.body.appendChild(sw);
    updateSwitcherUI(saved);
    sw.querySelectorAll('.theme-btn').forEach(btn =>
        btn.addEventListener('click', () => applyTheme(btn.dataset.theme))
    );
}

// ============================================================
//  MAIN INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // 0. Theme System
    initThemeSwitcher();

    // 1. Header Scroll Effect
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 100);
    });

    // 2. Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu    = document.getElementById('nav-menu');
    const navClose   = document.getElementById('nav-close');

    const closeMenu = () => {
        navMenu.classList.remove('active');
        const icon = mobileMenu.querySelector('i');
        if (icon) { icon.classList.add('fa-bars'); icon.classList.remove('fa-times'); }
    };

    mobileMenu.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = mobileMenu.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    if (navClose) navClose.addEventListener('click', closeMenu);
    navMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

    // 3. Reveal on Scroll
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        revealElements.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight - 120) {
                el.classList.add('active');
            }
        });
    };
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Activar elementos ya visibles al cargar

    // 4. Countdown Timer
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const updateCountdown = () => {
        const dist = targetDate - Date.now();
        if (dist < 0) {
            clearInterval(timerInterval);
            const cd = document.getElementById('countdown');
            if (cd) cd.innerHTML = '<h3>¡EVENTO EN CURSO!</h3>';
            return;
        }
        const pad = n => String(Math.floor(n)).padStart(2, '0');
        const el = id => document.getElementById(id);
        if (el('days'))    el('days').innerText    = pad(dist / 86400000);
        if (el('hours'))   el('hours').innerText   = pad((dist % 86400000) / 3600000);
        if (el('minutes')) el('minutes').innerText = pad((dist % 3600000)  / 60000);
        if (el('seconds')) el('seconds').innerText = pad((dist % 60000)    / 1000);
    };
    const timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown();

    // 5. Contact Form (Mock)
    const contactForm = document.getElementById('vibps-contact');
    if (contactForm) {
        contactForm.addEventListener('submit', e => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            btn.innerText = 'ENVIANDO...';
            btn.disabled = true;
            setTimeout(() => {
                alert('¡Propuesta enviada! Fernando se pondrá en contacto pronto.');
                btn.innerText = 'ENVIAR PROPUESTA';
                btn.disabled = false;
                contactForm.reset();
            }, 1500);
        });
    }

    // 6. Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // 7. Tilt 3D en bento cards (solo activo en V2)
    document.querySelectorAll('[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', e => {
            if (!document.body.classList.contains('theme-interactive')) return;
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            const rx = (0.5 - y) * 12;
            const ry = (x - 0.5) * 12;
            card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // 8. Contadores numéricos animados (Intersection Observer)
    const counters = document.querySelectorAll('.metric-num[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        const counterObs = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.dataset.count, 10);
                const duration = 1800;
                const start = performance.now();
                const tick = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - p, 3);
                    el.textContent = Math.floor(target * eased);
                    if (p < 1) requestAnimationFrame(tick);
                    else el.textContent = target;
                };
                requestAnimationFrame(tick);
                obs.unobserve(el);
            });
        }, { threshold: 0.4 });
        counters.forEach(c => counterObs.observe(c));
    }

    // ========================================================
    // 9. PÁGINA PREVENTAS — Filtro + búsqueda + mouse light V2
    // ========================================================
    const pvGrid    = document.getElementById('pv-grid');
    const pvPills   = document.getElementById('pv-filter-pills');
    const pvSearch  = document.getElementById('pv-search-input');
    const pvEmpty   = document.getElementById('pv-empty');

    if (pvGrid) {
        const pvCards = pvGrid.querySelectorAll('.pv-card');
        let currentFilter = 'all';

        const applyPvFilter = () => {
            const q = (pvSearch?.value || '').trim().toLowerCase();
            let visibleCount = 0;
            pvCards.forEach(card => {
                const matchStatus = currentFilter === 'all' || card.dataset.status === currentFilter;
                const name = (card.dataset.name || '').toLowerCase();
                const venue = card.querySelector('.pv-venue')?.textContent.toLowerCase() || '';
                const matchSearch = !q || name.includes(q) || venue.includes(q);
                const visible = matchStatus && matchSearch;
                card.classList.toggle('hidden', !visible);
                if (visible) visibleCount++;
            });
            if (pvEmpty) pvEmpty.style.display = visibleCount === 0 ? 'block' : 'none';
        };

        if (pvPills) {
            pvPills.querySelectorAll('.pv-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    pvPills.querySelectorAll('.pv-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    currentFilter = pill.dataset.filter;
                    applyPvFilter();
                });
            });
        }

        if (pvSearch) {
            let searchTimer;
            pvSearch.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(applyPvFilter, 150);
            });
        }

        // Mouse-following light en tarjetas (solo activo en V2)
        pvCards.forEach(card => {
            card.addEventListener('mousemove', e => {
                if (!document.body.classList.contains('theme-interactive')) return;
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
                card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
            });
        });
    }

    // ========================================================
    // 10. PÁGINA SERVICIOS — Tabs con accent dinámico
    // ========================================================
    const svTabs = document.getElementById('sv-tabs');
    if (svTabs) {
        const tabs   = svTabs.querySelectorAll('.sv-tab');
        const panels = document.querySelectorAll('.sv-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                const accent = tab.dataset.accent || '#00E5FF';

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                tab.style.setProperty('--tab-accent', accent);

                panels.forEach(p => {
                    if (p.dataset.tab === targetTab) {
                        p.classList.remove('active');
                        // Forzar reflow para reiniciar animación
                        void p.offsetWidth;
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            });
        });
    }

    // ========================================================
    // 11. PÁGINA SERVICIOS — Wizard de cotización
    // ========================================================
    const wizard = document.getElementById('quote-wizard');
    if (wizard) {
        const steps   = wizard.querySelectorAll('.wiz-step');
        const lines   = wizard.querySelectorAll('.wiz-line');
        const panels  = wizard.querySelectorAll('.wiz-panel');
        const btnPrev = wizard.querySelector('.wiz-prev');
        const btnNext = wizard.querySelector('.wiz-next');
        const btnSub  = wizard.querySelector('.wiz-submit');
        const loading = wizard.querySelector('#wiz-loading');
        let current = 1;
        const total = panels.length;

        const showStep = (n) => {
            current = n;
            steps.forEach(s => {
                const sn = parseInt(s.dataset.step, 10);
                s.classList.toggle('active', sn === n);
                s.classList.toggle('done', sn < n);
            });
            lines.forEach((l, i) => l.classList.toggle('done', i + 1 < n));
            panels.forEach(p => p.classList.toggle('active', parseInt(p.dataset.step, 10) === n));
            btnPrev.disabled = n === 1;
            btnNext.style.display = n < total ? '' : 'none';
            btnSub.style.display  = n === total ? '' : 'none';
        };

        btnNext.addEventListener('click', () => { if (current < total) showStep(current + 1); });
        btnPrev.addEventListener('click', () => { if (current > 1)     showStep(current - 1); });

        wizard.addEventListener('submit', e => {
            e.preventDefault();
            loading.classList.add('active');
            setTimeout(() => {
                loading.classList.remove('active');
                alert('¡Propuesta enviada! Fernando se pondrá en contacto en menos de 24 horas.');
                showStep(1);
                wizard.reset();
            }, 2200);
        });
    }

    // ========================================================
    // 12. PÁGINA NOSOTROS — Timeline reveal + parallax
    // ========================================================
    const timeline = document.getElementById('ns-timeline');
    if (timeline) {
        const milestones = timeline.querySelectorAll('.ns-milestone');
        if ('IntersectionObserver' in window) {
            const tlObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) entry.target.classList.add('active');
                });
            }, { threshold: 0.25 });
            milestones.forEach(m => tlObs.observe(m));
        } else {
            milestones.forEach(m => m.classList.add('active'));
        }
    }

    // Parallax para fondos decorativos
    const parallaxEls = document.querySelectorAll('.ns-parallax');
    if (parallaxEls.length) {
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            parallaxEls.forEach(el => {
                const speed = parseFloat(el.dataset.speed) || 0.4;
                el.style.transform = `translateY(${y * speed}px)`;
            });
        }, { passive: true });
    }

    // ========================================================
    // 13. PÁGINA HISTORIAS — Tilt + Lightbox
    // ========================================================
    const hsGallery = document.getElementById('hs-gallery');
    const hsLightbox = document.getElementById('hs-lightbox');

    if (hsGallery) {
        const items = hsGallery.querySelectorAll('.hs-item');

        // Aplicar tilt aleatorio como CSS var
        items.forEach(item => {
            const deg = item.dataset.tiltDeg || '0';
            item.style.setProperty('--tilt-deg', deg + 'deg');
        });

        // Click para abrir lightbox
        if (hsLightbox) {
            const lbImg   = document.getElementById('hs-lb-img');
            const lbTitle = document.getElementById('hs-lb-title');
            const lbDesc  = document.getElementById('hs-lb-desc');
            const lbClose = document.getElementById('hs-lb-close');

            items.forEach(item => {
                item.addEventListener('click', () => {
                    const img   = item.querySelector('img');
                    const title = item.querySelector('h3')?.textContent || '';
                    const desc  = item.dataset.desc || item.querySelector('span')?.textContent || '';
                    lbImg.src = img.src.replace('w=700', 'w=1400');
                    lbImg.alt = img.alt;
                    lbTitle.textContent = title;
                    lbDesc.textContent  = desc;
                    hsLightbox.classList.add('open');
                    document.body.style.overflow = 'hidden';
                });
            });

            const closeLb = () => {
                hsLightbox.classList.remove('open');
                document.body.style.overflow = '';
            };
            lbClose.addEventListener('click', closeLb);
            hsLightbox.addEventListener('click', e => {
                if (e.target === hsLightbox) closeLb();
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && hsLightbox.classList.contains('open')) closeLb();
            });
        }
    }

    // ========================================================
    // 14. PÁGINA FAQ — Búsqueda predictiva con highlight
    // ========================================================
    const faqSearch = document.getElementById('faq-search');
    const faqList   = document.getElementById('faq-list');
    const faqEmpty  = document.getElementById('faq-empty');
    const faqCount  = document.getElementById('faq-search-count');

    if (faqSearch && faqList) {
        const items = faqList.querySelectorAll('.faq-item');

        // Guardar texto original para reset de highlights
        items.forEach(item => {
            const q = item.querySelector('.faq-q');
            const ans = item.querySelector('.faq-answer p');
            if (q)   q.dataset.original = q.textContent;
            if (ans) ans.dataset.original = ans.textContent;
        });

        const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const applyFaqSearch = () => {
            const q = faqSearch.value.trim().toLowerCase();
            let visible = 0;
            items.forEach(item => {
                const qEl   = item.querySelector('.faq-q');
                const aEl   = item.querySelector('.faq-answer p');
                const qText = (qEl?.dataset.original || '').toLowerCase();
                const aText = (aEl?.dataset.original || '').toLowerCase();

                if (!q) {
                    item.classList.remove('hidden', 'match');
                    item.removeAttribute('open');
                    if (qEl) qEl.innerHTML = qEl.dataset.original;
                    if (aEl) aEl.innerHTML = aEl.dataset.original;
                    visible++;
                    return;
                }

                const match = qText.includes(q) || aText.includes(q);
                item.classList.toggle('hidden', !match);
                item.classList.toggle('match', match);

                if (match) {
                    visible++;
                    item.setAttribute('open', '');
                    const re = new RegExp(`(${escapeReg(q)})`, 'gi');
                    if (qEl) qEl.innerHTML = qEl.dataset.original.replace(re, '<mark>$1</mark>');
                    if (aEl) aEl.innerHTML = aEl.dataset.original.replace(re, '<mark>$1</mark>');
                }
            });

            if (faqEmpty) faqEmpty.style.display = visible === 0 ? 'block' : 'none';
            if (faqCount) faqCount.textContent = q ? `${visible} resultado${visible === 1 ? '' : 's'}` : '';
        };

        let timer;
        faqSearch.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(applyFaqSearch, 120);
        });
    }
});
