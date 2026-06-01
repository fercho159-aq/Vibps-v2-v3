/* ============================================================
   ViBPS · CHECKOUT SIMULADO (MERCADO PAGO MOCK)
   ============================================================
   Maneja la pasarela de pago simulada y la persistencia en
   localStorage. Expone window.initMercadoPagoCheckout(eventData)
   y auto-engancha cualquier botón .pv-cta de preventas.html.
   ============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       1. CAPA DE PERSISTENCIA (Mock Backend con localStorage)
    ------------------------------------------------------------------ */
    const STORAGE_KEYS = {
        pedidos: 'vibps_pedidos',
        eventos: 'vibps_eventos',
        analytics: 'vibps_analytics'
    };

    const VibpsDB = {
        getPedidos() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.pedidos)) || []; }
            catch (e) { return []; }
        },
        savePedido(pedido) {
            const pedidos = this.getPedidos();
            pedidos.unshift(pedido);
            localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidos));
            return pedido;
        },
        updatePedido(id, patch) {
            const pedidos = this.getPedidos();
            const idx = pedidos.findIndex(p => p.id === id);
            if (idx === -1) return null;
            pedidos[idx] = { ...pedidos[idx], ...patch };
            localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidos));
            return pedidos[idx];
        },
        deletePedido(id) {
            const pedidos = this.getPedidos().filter(p => p.id !== id);
            localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidos));
        },
        getEventos() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.eventos)) || []; }
            catch (e) { return []; }
        },
        saveEvento(evento) {
            const eventos = this.getEventos();
            eventos.unshift(evento);
            localStorage.setItem(STORAGE_KEYS.eventos, JSON.stringify(eventos));
            return evento;
        },
        deleteEvento(id) {
            const eventos = this.getEventos().filter(e => e.id !== id);
            localStorage.setItem(STORAGE_KEYS.eventos, JSON.stringify(eventos));
        },
        registerClick(eventoNombre) {
            const analytics = this.getAnalytics();
            analytics.clicks = (analytics.clicks || 0) + 1;
            analytics.clicksPorEvento = analytics.clicksPorEvento || {};
            analytics.clicksPorEvento[eventoNombre] = (analytics.clicksPorEvento[eventoNombre] || 0) + 1;
            localStorage.setItem(STORAGE_KEYS.analytics, JSON.stringify(analytics));
        },
        getAnalytics() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.analytics)) || {}; }
            catch (e) { return {}; }
        }
    };

    // Exponer globalmente para admin.js
    window.VibpsDB = VibpsDB;

    /* ------------------------------------------------------------------
       2. HELPERS
    ------------------------------------------------------------------ */
    function generateOrderCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return `VIBPS-2026-${code}`;
    }

    function formatMoney(n) {
        return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 });
    }

    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, m =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }

    /* ------------------------------------------------------------------
       3. INYECCIÓN DEL MODAL (single instance, lazy)
    ------------------------------------------------------------------ */
    function injectCheckoutModal() {
        if (document.getElementById('mp-checkout')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'mp-checkout';
        wrapper.className = 'mp-checkout-overlay';
        wrapper.setAttribute('aria-hidden', 'true');
        wrapper.innerHTML = `
          <div class="mp-modal" role="dialog" aria-modal="true">
            <button class="mp-close" id="mp-close" aria-label="Cerrar">&times;</button>

            <!-- STEP 1: Form + Resumen -->
            <div class="mp-step mp-step-form active" data-step="form">
              <div class="mp-header">
                <span class="mp-brand">
                  <span class="mp-brand-dot"></span>
                  MERCADO PAGO
                </span>
                <h2>Confirma tu compra</h2>
                <p class="mp-subhead">Completa los datos para procesar tu acceso.</p>
              </div>

              <div class="mp-event-card">
                <img class="mp-event-img" src="" alt="">
                <div class="mp-event-info">
                  <h3 class="mp-event-name"></h3>
                  <span class="mp-event-venue"></span>
                  <span class="mp-event-date"></span>
                </div>
              </div>

              <form class="mp-form" id="mp-form" novalidate>
                <div class="mp-form-group">
                  <label for="mp-nombre">Nombre completo</label>
                  <input type="text" id="mp-nombre" required autocomplete="name">
                </div>
                <div class="mp-form-row">
                  <div class="mp-form-group">
                    <label for="mp-email">Email</label>
                    <input type="email" id="mp-email" required autocomplete="email">
                  </div>
                  <div class="mp-form-group">
                    <label for="mp-telefono">Teléfono</label>
                    <input type="tel" id="mp-telefono" required autocomplete="tel" placeholder="55 1234 5678">
                  </div>
                </div>
                <div class="mp-form-group mp-qty-group">
                  <label>Cantidad de boletos</label>
                  <div class="mp-counter">
                    <button type="button" class="mp-minus" aria-label="Restar">−</button>
                    <span class="mp-count" id="mp-count">1</span>
                    <button type="button" class="mp-plus" aria-label="Sumar">+</button>
                  </div>
                </div>
              </form>

              <div class="mp-breakdown">
                <div class="mp-row">
                  <span>Subtotal</span>
                  <span id="mp-subtotal">$0</span>
                </div>
                <div class="mp-row">
                  <span>Cargo por servicio <small>(10%)</small></span>
                  <span id="mp-fee">$0</span>
                </div>
                <div class="mp-row mp-total-row">
                  <span>Total</span>
                  <span id="mp-total-amount">$0 MXN</span>
                </div>
              </div>

              <button type="button" class="mp-pay-btn" id="mp-pay">
                <i class="fas fa-lock"></i>
                <span>Pagar con Mercado Pago</span>
              </button>

              <p class="mp-secure-note">
                <i class="fas fa-shield-alt"></i> Pago 100% seguro · Encriptación SSL
              </p>
            </div>

            <!-- STEP 2: Loading -->
            <div class="mp-step mp-step-loading" data-step="loading">
              <div class="mp-spinner"></div>
              <h3>Procesando tu pago…</h3>
              <p>Conectando con los servidores de Mercado Pago</p>
              <div class="mp-loading-bar"><div class="mp-loading-fill"></div></div>
            </div>

            <!-- STEP 3: Success -->
            <div class="mp-step mp-step-success" data-step="success">
              <div class="mp-check-wrap">
                <svg class="mp-check-svg" viewBox="0 0 100 100">
                  <circle class="mp-check-circle" cx="50" cy="50" r="46" />
                  <path class="mp-check-path" d="M28 52 L44 68 L74 36" />
                </svg>
              </div>
              <h2>¡Pago aprobado!</h2>
              <p class="mp-success-msg">Tu acceso ha sido confirmado.</p>
              <div class="mp-order-box">
                <span class="mp-order-label">CÓDIGO DE ORDEN</span>
                <span class="mp-order-code" id="mp-order-code"></span>
              </div>
              <p class="mp-success-detail">
                Recibirás un email con tu QR de acceso en los próximos minutos.
                Guarda este código por seguridad.
              </p>
              <button type="button" class="mp-done" id="mp-done">Listo</button>
            </div>

            <!-- STEP 4: Failure (opcional, accesible vía estado) -->
            <div class="mp-step mp-step-failure" data-step="failure">
              <div class="mp-fail-icon"><i class="fas fa-times-circle"></i></div>
              <h2>Pago rechazado</h2>
              <p>No pudimos procesar el pago. Verifica tus datos o intenta otra tarjeta.</p>
              <button type="button" class="mp-retry" id="mp-retry">Intentar de nuevo</button>
            </div>
          </div>
        `;
        document.body.appendChild(wrapper);
        bindModalEvents();
    }

    /* ------------------------------------------------------------------
       4. ESTADO DEL MODAL
    ------------------------------------------------------------------ */
    let currentEvent = null;
    let currentQty = 1;

    function setStep(stepName) {
        const modal = document.getElementById('mp-checkout');
        modal.querySelectorAll('.mp-step').forEach(s => s.classList.remove('active'));
        const target = modal.querySelector(`[data-step="${stepName}"]`);
        if (target) target.classList.add('active');
    }

    function updateTotals() {
        if (!currentEvent) return;
        const subtotal = currentEvent.precio * currentQty;
        const fee = Math.round(subtotal * 0.10);
        const total = subtotal + fee;
        document.getElementById('mp-subtotal').textContent = formatMoney(subtotal);
        document.getElementById('mp-fee').textContent = formatMoney(fee);
        document.getElementById('mp-total-amount').textContent = formatMoney(total) + ' MXN';
        document.getElementById('mp-count').textContent = currentQty;
    }

    function openCheckout(eventData) {
        currentEvent = eventData;
        currentQty = 1;
        injectCheckoutModal();
        const modal = document.getElementById('mp-checkout');

        // Render event data
        modal.querySelector('.mp-event-img').src = eventData.imagen || '';
        modal.querySelector('.mp-event-img').alt = eventData.nombre;
        modal.querySelector('.mp-event-name').textContent = eventData.nombre;
        modal.querySelector('.mp-event-venue').textContent = eventData.venue || '';
        modal.querySelector('.mp-event-date').textContent = eventData.fecha || '';

        // Reset form
        modal.querySelector('#mp-form').reset();
        setStep('form');
        updateTotals();

        // Show
        requestAnimationFrame(() => {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });

        VibpsDB.registerClick(eventData.nombre);
    }

    function closeCheckout() {
        const modal = document.getElementById('mp-checkout');
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /* ------------------------------------------------------------------
       5. SIMULACIÓN DEL SDK DE MERCADO PAGO
    ------------------------------------------------------------------ */
    function initMercadoPagoCheckout(eventData) {
        // En producción aquí iría:
        // const mp = new MercadoPago('YOUR_PUBLIC_KEY');
        // const preference = await fetch('/api/create_preference', {...});
        // mp.checkout({ preference: { id: preference.id }, ... });
        //
        // Por ahora simulamos abriendo el modal local.
        openCheckout(eventData);
    }
    window.initMercadoPagoCheckout = initMercadoPagoCheckout;

    function processMockPayment() {
        const nombre = document.getElementById('mp-nombre').value.trim();
        const email = document.getElementById('mp-email').value.trim();
        const telefono = document.getElementById('mp-telefono').value.trim();

        if (!nombre || !email || !telefono) {
            // Marcar inputs vacíos
            ['mp-nombre', 'mp-email', 'mp-telefono'].forEach(id => {
                const inp = document.getElementById(id);
                if (!inp.value.trim()) inp.classList.add('mp-error');
                else inp.classList.remove('mp-error');
            });
            return;
        }

        const subtotal = currentEvent.precio * currentQty;
        const fee = Math.round(subtotal * 0.10);
        const total = subtotal + fee;

        setStep('loading');

        // Simula latencia del servidor de MP
        setTimeout(() => {
            // 95% éxito, 5% fallo (simulación realista)
            const success = Math.random() > 0.05;

            if (success) {
                const orderCode = generateOrderCode();
                const pedido = {
                    id: orderCode,
                    cliente: { nombre, email, telefono },
                    evento: {
                        id: currentEvent.id,
                        nombre: currentEvent.nombre,
                        fecha: currentEvent.fecha,
                        venue: currentEvent.venue || ''
                    },
                    cantidad: currentQty,
                    precioUnitario: currentEvent.precio,
                    subtotal,
                    cargoServicio: fee,
                    total,
                    estado: 'aprobado',
                    metodoPago: 'Mercado Pago',
                    fecha: new Date().toISOString()
                };
                VibpsDB.savePedido(pedido);

                document.getElementById('mp-order-code').textContent = '#' + orderCode;
                setStep('success');

                // Disparo de evento global por si otros módulos escuchan
                window.dispatchEvent(new CustomEvent('vibps:pedido-creado', { detail: pedido }));
            } else {
                setStep('failure');
            }
        }, 2000);
    }

    /* ------------------------------------------------------------------
       6. EVENTOS DEL MODAL
    ------------------------------------------------------------------ */
    function bindModalEvents() {
        const modal = document.getElementById('mp-checkout');

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCheckout();
        });

        document.getElementById('mp-close').addEventListener('click', closeCheckout);

        document.querySelector('.mp-minus').addEventListener('click', () => {
            if (currentQty > 1) { currentQty--; updateTotals(); }
        });
        document.querySelector('.mp-plus').addEventListener('click', () => {
            if (currentQty < 10) { currentQty++; updateTotals(); }
        });

        document.getElementById('mp-pay').addEventListener('click', processMockPayment);
        document.getElementById('mp-done').addEventListener('click', closeCheckout);
        document.getElementById('mp-retry').addEventListener('click', () => setStep('form'));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeCheckout();
        });
    }

    /* ------------------------------------------------------------------
       7. AUTO-BIND a .pv-cta de preventas.html
    ------------------------------------------------------------------ */
    function extractEventDataFromCard(card) {
        const img = card.querySelector('.pv-img img');
        const day = card.querySelector('.pv-day')?.textContent.trim() || '';
        const month = card.querySelector('.pv-month')?.textContent.trim() || '';
        const priceText = card.querySelector('.pv-price')?.textContent || '0';
        const precio = parseInt(priceText.replace(/[^\d]/g, ''), 10) || 0;

        return {
            id: card.dataset.eventId || ('evt-' + (card.dataset.name || '').toLowerCase().replace(/\s+/g, '-')),
            nombre: card.dataset.name || card.querySelector('h3')?.textContent || 'Evento',
            venue: card.querySelector('.pv-venue')?.textContent || '',
            fecha: `${day} ${month}`,
            precio,
            imagen: img?.src || '',
            status: card.dataset.status || 'general'
        };
    }

    function bindPreventaButtons() {
        document.addEventListener('click', (e) => {
            const cta = e.target.closest('.pv-cta');
            if (!cta) return;
            e.preventDefault();
            const card = cta.closest('.pv-card');
            if (!card) return;
            const data = extractEventDataFromCard(card);
            initMercadoPagoCheckout(data);
        });
    }

    /* ------------------------------------------------------------------
       8. RENDER DE EVENTOS DINÁMICOS (desde admin)
    ------------------------------------------------------------------ */
    function renderDynamicEvents() {
        const grid = document.getElementById('pv-grid');
        if (!grid) return;
        const eventos = VibpsDB.getEventos();
        if (!eventos.length) return;

        eventos.forEach(ev => {
            // Evitar duplicados si ya está renderizado
            if (grid.querySelector(`[data-event-id="${ev.id}"]`)) return;

            const article = document.createElement('article');
            article.className = 'pv-card pv-card-custom';
            article.dataset.status = ev.estado || 'general';
            article.dataset.name = ev.nombre;
            article.dataset.eventId = ev.id;

            const fecha = ev.fechaDisplay || {
                dia: new Date(ev.fecha).getDate().toString().padStart(2, '0'),
                mes: new Date(ev.fecha).toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')
            };

            const badgeClass = `badge-${ev.estado || 'general'}`;
            const badgeText = {
                early: 'Early Bird',
                fase1: 'Fase 1',
                last: '¡ÚLTIMOS CUPOS!',
                general: 'Disponible'
            }[ev.estado] || 'Disponible';

            article.innerHTML = `
                <div class="pv-img">
                    <img src="${escapeHTML(ev.imagen)}" alt="${escapeHTML(ev.nombre)}">
                    <span class="pv-date">
                        <span class="pv-day">${escapeHTML(fecha.dia)}</span>
                        <span class="pv-month">${escapeHTML(fecha.mes)}</span>
                    </span>
                    <span class="pv-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="pv-body">
                    <h3>${escapeHTML(ev.nombre)}</h3>
                    <p class="pv-venue">${escapeHTML(ev.venue || ev.descripcion || '')}</p>
                    <div class="pv-meta">
                        <span class="pv-price">${formatMoney(ev.precio)} MXN</span>
                        <span class="pv-availability">${ev.cuposVendidos || 0} / ${ev.cuposTotales}</span>
                    </div>
                    <a href="#" class="btn btn-primary pv-cta">
                        <span class="cta-v1">Solicitar Acceso</span>
                        <span class="cta-v2">¡COMPRAR PREVENTA!</span>
                    </a>
                </div>
            `;
            grid.prepend(article);
        });
    }

    /* ------------------------------------------------------------------
       9. INIT
    ------------------------------------------------------------------ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        renderDynamicEvents();
        bindPreventaButtons();
    }

})();
