/* ============================================================
   ViBPS · ADMIN DASHBOARD LOGIC
   ============================================================
   Lee/escribe sobre las claves vibps_pedidos, vibps_eventos y
   vibps_analytics del localStorage. Renderiza KPIs, tabla
   dinámica, formulario de eventos y mini-gráficas.
   ============================================================ */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       0. ACCESO A LA CAPA DE DATOS
       checkout.js expone window.VibpsDB; si por algún motivo
       admin.html se carga sin él, replicamos la API.
    ------------------------------------------------------------------ */
    const VibpsDB = window.VibpsDB || (function () {
        const KEYS = { pedidos: 'vibps_pedidos', eventos: 'vibps_eventos', analytics: 'vibps_analytics' };
        return {
            getPedidos() { try { return JSON.parse(localStorage.getItem(KEYS.pedidos)) || []; } catch { return []; } },
            updatePedido(id, patch) {
                const list = this.getPedidos();
                const idx = list.findIndex(p => p.id === id);
                if (idx === -1) return null;
                list[idx] = { ...list[idx], ...patch };
                localStorage.setItem(KEYS.pedidos, JSON.stringify(list));
                return list[idx];
            },
            deletePedido(id) {
                localStorage.setItem(KEYS.pedidos, JSON.stringify(this.getPedidos().filter(p => p.id !== id)));
            },
            getEventos() { try { return JSON.parse(localStorage.getItem(KEYS.eventos)) || []; } catch { return []; } },
            saveEvento(e) {
                const list = this.getEventos();
                list.unshift(e);
                localStorage.setItem(KEYS.eventos, JSON.stringify(list));
            },
            deleteEvento(id) {
                localStorage.setItem(KEYS.eventos, JSON.stringify(this.getEventos().filter(e => e.id !== id)));
            },
            getAnalytics() { try { return JSON.parse(localStorage.getItem(KEYS.analytics)) || {}; } catch { return {}; } }
        };
    })();

    /* ------------------------------------------------------------------
       1. HELPERS
    ------------------------------------------------------------------ */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    function formatMoney(n) { return '$' + Number(n || 0).toLocaleString('es-MX'); }
    function escapeHTML(s) {
        return String(s ?? '').replace(/[&<>"']/g, m =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    }
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' · ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    /* ------------------------------------------------------------------
       2. KPIs
    ------------------------------------------------------------------ */
    function renderKPIs() {
        const pedidos = VibpsDB.getPedidos();
        const aprobados = pedidos.filter(p => p.estado === 'aprobado');
        const eventos = VibpsDB.getEventos();
        const analytics = VibpsDB.getAnalytics();

        // Ingresos totales
        const ingresos = aprobados.reduce((sum, p) => sum + (p.total || 0), 0);
        $('#kpi-ingresos').textContent = formatMoney(ingresos);

        // Boletos vendidos
        const boletos = aprobados.reduce((sum, p) => sum + (p.cantidad || 0), 0);
        $('#kpi-boletos').textContent = boletos.toLocaleString('es-MX');

        // Tasa de conversión (clicks → compras)
        const clicks = analytics.clicks || 0;
        const conv = clicks > 0 ? ((aprobados.length / clicks) * 100).toFixed(1) : '0.0';
        $('#kpi-conversion').textContent = conv + '%';
        $('#kpi-conversion-detail').textContent = `${aprobados.length} ventas / ${clicks} clics`;

        // Próximo evento
        renderProximoEvento(eventos, aprobados);
    }

    function renderProximoEvento(eventos, aprobados) {
        const target = $('#kpi-evento');
        const detail = $('#kpi-evento-detail');
        const fill = $('#kpi-evento-fill');

        // Tomar el evento más cercano en el futuro
        const futuros = eventos
            .filter(e => e.fecha && new Date(e.fecha) >= new Date(new Date().toDateString()))
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        if (!futuros.length) {
            target.textContent = '—';
            detail.textContent = 'Sin eventos programados';
            fill.style.width = '0%';
            return;
        }

        const ev = futuros[0];
        const diff = Math.ceil((new Date(ev.fecha) - new Date()) / (1000 * 60 * 60 * 24));
        const vendidosEvento = aprobados
            .filter(p => p.evento?.id === ev.id || p.evento?.nombre === ev.nombre)
            .reduce((s, p) => s + p.cantidad, 0);
        const aforoPct = ev.cuposTotales > 0 ? Math.min(100, (vendidosEvento / ev.cuposTotales) * 100) : 0;

        target.textContent = `${diff}d`;
        detail.textContent = `${ev.nombre} · ${aforoPct.toFixed(0)}% aforo`;
        fill.style.width = aforoPct + '%';
    }

    /* ------------------------------------------------------------------
       3. TABLA DE PEDIDOS
    ------------------------------------------------------------------ */
    let currentFilter = 'all';
    let currentSearch = '';

    function renderPedidos() {
        const tbody = $('#ad-pedidos-body');
        const empty = $('#ad-pedidos-empty');
        let pedidos = VibpsDB.getPedidos();

        // Filtrado
        if (currentFilter !== 'all') {
            pedidos = pedidos.filter(p => p.estado === currentFilter);
        }
        if (currentSearch) {
            const q = currentSearch.toLowerCase();
            pedidos = pedidos.filter(p =>
                p.id.toLowerCase().includes(q) ||
                p.cliente?.nombre?.toLowerCase().includes(q) ||
                p.evento?.nombre?.toLowerCase().includes(q));
        }

        if (!pedidos.length) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            $('#ad-pedidos-count').textContent = '0';
            return;
        }
        empty.style.display = 'none';
        $('#ad-pedidos-count').textContent = pedidos.length;

        tbody.innerHTML = pedidos.map(p => `
            <tr data-id="${escapeHTML(p.id)}">
                <td><code class="ad-id">#${escapeHTML(p.id)}</code></td>
                <td>
                    <div class="ad-cli">
                        <strong>${escapeHTML(p.cliente?.nombre || '—')}</strong>
                        <small>${escapeHTML(p.cliente?.email || '')}</small>
                    </div>
                </td>
                <td>${escapeHTML(p.evento?.nombre || '—')}</td>
                <td class="ad-center">${p.cantidad || 0}</td>
                <td class="ad-money">${formatMoney(p.total)}</td>
                <td><span class="ad-status ad-status-${p.estado}">${labelEstado(p.estado)}</span></td>
                <td class="ad-date">${formatDate(p.fecha)}</td>
                <td class="ad-actions">
                    <button class="ad-act ad-act-view" data-action="view" data-id="${escapeHTML(p.id)}" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="ad-act ad-act-cancel" data-action="cancel" data-id="${escapeHTML(p.id)}" title="Cancelar pedido" ${p.estado === 'cancelado' ? 'disabled' : ''}>
                        <i class="fas fa-ban"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function labelEstado(e) {
        return ({ aprobado: 'Aprobado', pendiente: 'Pendiente', cancelado: 'Cancelado' }[e] || e);
    }

    /* ------------------------------------------------------------------
       4. MODAL DETALLE PEDIDO
    ------------------------------------------------------------------ */
    function openDetailModal(id) {
        const pedido = VibpsDB.getPedidos().find(p => p.id === id);
        if (!pedido) return;

        const modal = $('#ad-detail-modal');
        modal.querySelector('.ad-modal-body').innerHTML = `
            <h3>Pedido #${escapeHTML(pedido.id)}</h3>
            <div class="ad-detail-grid">
                <div class="ad-detail-section">
                    <h4>Cliente</h4>
                    <p><strong>${escapeHTML(pedido.cliente?.nombre || '—')}</strong></p>
                    <p><i class="fas fa-envelope"></i> ${escapeHTML(pedido.cliente?.email || '—')}</p>
                    <p><i class="fas fa-phone"></i> ${escapeHTML(pedido.cliente?.telefono || '—')}</p>
                </div>
                <div class="ad-detail-section">
                    <h4>Evento</h4>
                    <p><strong>${escapeHTML(pedido.evento?.nombre || '—')}</strong></p>
                    <p><i class="fas fa-map-marker-alt"></i> ${escapeHTML(pedido.evento?.venue || 'Por definir')}</p>
                    <p><i class="fas fa-calendar"></i> ${escapeHTML(pedido.evento?.fecha || '—')}</p>
                </div>
                <div class="ad-detail-section">
                    <h4>Compra</h4>
                    <p>Cantidad: <strong>${pedido.cantidad}</strong></p>
                    <p>Precio unitario: ${formatMoney(pedido.precioUnitario)}</p>
                    <p>Subtotal: ${formatMoney(pedido.subtotal)}</p>
                    <p>Cargo por servicio: ${formatMoney(pedido.cargoServicio)}</p>
                    <p class="ad-detail-total">Total: <strong>${formatMoney(pedido.total)} MXN</strong></p>
                </div>
                <div class="ad-detail-section">
                    <h4>Estado</h4>
                    <p><span class="ad-status ad-status-${pedido.estado}">${labelEstado(pedido.estado)}</span></p>
                    <p>Método: ${escapeHTML(pedido.metodoPago || 'Mercado Pago')}</p>
                    <p>Fecha: ${formatDate(pedido.fecha)}</p>
                </div>
            </div>
        `;
        modal.classList.add('open');
    }

    function closeDetailModal() {
        $('#ad-detail-modal').classList.remove('open');
    }

    /* ------------------------------------------------------------------
       5. ACCIONES DE TABLA (event delegation)
    ------------------------------------------------------------------ */
    function bindTableActions() {
        $('#ad-pedidos-body').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'view') openDetailModal(id);
            if (action === 'cancel') {
                if (confirm('¿Cancelar este pedido? El stock volverá a estar disponible.')) {
                    VibpsDB.updatePedido(id, { estado: 'cancelado' });
                    refreshAll();
                }
            }
        });

        $('#ad-detail-close').addEventListener('click', closeDetailModal);
        $('#ad-detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'ad-detail-modal') closeDetailModal();
        });

        // Filtros
        $$('.ad-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.ad-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderPedidos();
            });
        });

        // Search
        $('#ad-search').addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            renderPedidos();
        });
    }

    /* ------------------------------------------------------------------
       6. FORMULARIO DE EVENTOS
    ------------------------------------------------------------------ */
    function bindEventForm() {
        $('#ad-event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const nombre = form.nombre.value.trim();
            const fecha = form.fecha.value;
            const precio = parseFloat(form.precio.value);
            const cupos = parseInt(form.cupos.value, 10);
            const imagen = form.imagen.value.trim();
            const descripcion = form.descripcion.value.trim();
            const estado = form.estado.value;
            const venue = form.venue.value.trim();

            if (!nombre || !fecha || isNaN(precio) || isNaN(cupos)) {
                showToast('Completa los campos obligatorios', 'error');
                return;
            }

            const evento = {
                id: 'evt-' + Date.now(),
                nombre,
                fecha,
                fechaDisplay: {
                    dia: new Date(fecha).getDate().toString().padStart(2, '0'),
                    mes: new Date(fecha).toLocaleString('es-MX', { month: 'short' }).toUpperCase().replace('.', '')
                },
                precio,
                cuposTotales: cupos,
                cuposVendidos: 0,
                imagen: imagen || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600',
                descripcion,
                venue,
                estado,
                fechaCreacion: new Date().toISOString()
            };

            VibpsDB.saveEvento(evento);
            form.reset();
            showToast('✓ Evento publicado y disponible en preventas.html', 'success');
            renderEventosList();
            renderKPIs();
        });
    }

    function renderEventosList() {
        const list = $('#ad-eventos-list');
        const eventos = VibpsDB.getEventos();
        if (!eventos.length) {
            list.innerHTML = '<p class="ad-empty">Aún no has publicado eventos personalizados.</p>';
            return;
        }
        list.innerHTML = eventos.map(ev => `
            <div class="ad-evento-item">
                <img src="${escapeHTML(ev.imagen)}" alt="">
                <div class="ad-evento-info">
                    <h4>${escapeHTML(ev.nombre)}</h4>
                    <span><i class="fas fa-calendar"></i> ${escapeHTML(ev.fecha)}</span>
                    <span><i class="fas fa-ticket-alt"></i> ${formatMoney(ev.precio)} · ${ev.cuposTotales} cupos</span>
                </div>
                <button class="ad-evento-del" data-id="${escapeHTML(ev.id)}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        list.querySelectorAll('.ad-evento-del').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('¿Eliminar este evento? Los pedidos previos no se borrarán.')) {
                    VibpsDB.deleteEvento(btn.dataset.id);
                    renderEventosList();
                    renderKPIs();
                }
            });
        });
    }

    /* ------------------------------------------------------------------
       7. ANALÍTICAS (charts CSS)
    ------------------------------------------------------------------ */
    function renderAnalytics() {
        const pedidos = VibpsDB.getPedidos().filter(p => p.estado === 'aprobado');

        // 7.1 Ventas por hora del día (0-23) → agrupar en 4 bloques
        const bloques = { '00-06': 0, '07-12': 0, '13-18': 0, '19-23': 0 };
        pedidos.forEach(p => {
            const h = new Date(p.fecha).getHours();
            if (h < 7) bloques['00-06'] += p.cantidad;
            else if (h < 13) bloques['07-12'] += p.cantidad;
            else if (h < 19) bloques['13-18'] += p.cantidad;
            else bloques['19-23'] += p.cantidad;
        });
        const maxBloque = Math.max(...Object.values(bloques), 1);
        const horasHTML = Object.entries(bloques).map(([rango, val]) => `
            <div class="ad-bar-item">
                <div class="ad-bar-wrap">
                    <div class="ad-bar" style="height: ${(val / maxBloque) * 100}%">
                        <span class="ad-bar-val">${val}</span>
                    </div>
                </div>
                <span class="ad-bar-label">${rango}h</span>
            </div>
        `).join('');
        $$('#ad-chart-horas, #ad-chart-horas-2').forEach(el => el.innerHTML = horasHTML);

        // 7.2 Evento más popular
        const conteoEventos = {};
        pedidos.forEach(p => {
            const k = p.evento?.nombre || '—';
            conteoEventos[k] = (conteoEventos[k] || 0) + p.cantidad;
        });
        const ranking = Object.entries(conteoEventos)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const maxEv = ranking[0]?.[1] || 1;

        const rankHTML = ranking.length ? ranking.map(([nombre, val], i) => `
            <div class="ad-hbar-item">
                <span class="ad-hbar-label">${escapeHTML(nombre)}</span>
                <div class="ad-hbar-track">
                    <div class="ad-hbar-fill" style="width: ${(val / maxEv) * 100}%; --bar-i: ${i}">
                        <span class="ad-hbar-val">${val}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p class="ad-empty">Sin datos suficientes para ranking.</p>';
        $$('#ad-chart-eventos, #ad-chart-eventos-2').forEach(el => el.innerHTML = rankHTML);
    }

    /* ------------------------------------------------------------------
       8. TOASTS
    ------------------------------------------------------------------ */
    function showToast(msg, type = 'info') {
        let toast = $('#ad-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ad-toast';
            toast.className = 'ad-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = `ad-toast ad-toast-${type} show`;
        clearTimeout(toast._t);
        toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    /* ------------------------------------------------------------------
       9. NAVEGACIÓN SIDEBAR
    ------------------------------------------------------------------ */
    function bindSidebarNav() {
        $$('.ad-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.dataset.section;
                $$('.ad-nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                $$('.ad-section').forEach(s => s.classList.remove('active'));
                $(`#section-${target}`)?.classList.add('active');
                // Toggle sidebar en mobile
                $('#ad-sidebar')?.classList.remove('open');
            });
        });

        $('#ad-menu-toggle')?.addEventListener('click', () => {
            $('#ad-sidebar')?.classList.toggle('open');
        });
    }

    /* ------------------------------------------------------------------
       10. SEED DE DEMO (si está vacío)
    ------------------------------------------------------------------ */
    function seedDemoIfEmpty() {
        if (VibpsDB.getPedidos().length > 0) return;

        const nombres = ['María González', 'Carlos Ramírez', 'Ana Sofía Vega', 'Luis Mendoza', 'Paola Castro'];
        const eventosNombres = ['NEON NIGHT VOL. 4', 'CYBER RAVE CDMX', 'UNDERGROUND SESSION', 'FULL MOON PARTY'];
        const precios = [450, 600, 350, 550];
        const demo = [];

        for (let i = 0; i < 8; i++) {
            const idx = i % eventosNombres.length;
            const cant = Math.ceil(Math.random() * 3);
            const subtotal = precios[idx] * cant;
            const fee = Math.round(subtotal * 0.10);
            const horaRandom = Math.floor(Math.random() * 24);
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 14));
            fecha.setHours(horaRandom);

            demo.push({
                id: 'VIBPS-2026-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                cliente: {
                    nombre: nombres[i % nombres.length],
                    email: nombres[i % nombres.length].toLowerCase().split(' ')[0] + '@example.com',
                    telefono: '55' + Math.floor(10000000 + Math.random() * 89999999)
                },
                evento: { id: 'evt-demo-' + idx, nombre: eventosNombres[idx], fecha: '15 JUN' },
                cantidad: cant,
                precioUnitario: precios[idx],
                subtotal,
                cargoServicio: fee,
                total: subtotal + fee,
                estado: Math.random() > 0.15 ? 'aprobado' : 'pendiente',
                metodoPago: 'Mercado Pago',
                fecha: fecha.toISOString()
            });
        }
        localStorage.setItem('vibps_pedidos', JSON.stringify(demo));

        // Seed analytics
        localStorage.setItem('vibps_analytics', JSON.stringify({ clicks: 47, clicksPorEvento: {} }));
    }

    /* ------------------------------------------------------------------
       11. REFRESH GLOBAL
    ------------------------------------------------------------------ */
    function refreshAll() {
        renderKPIs();
        renderPedidos();
        renderEventosList();
        renderAnalytics();
    }

    /* ------------------------------------------------------------------
       12. ESCUCHA EVENTOS DE OTRAS PESTAÑAS
    ------------------------------------------------------------------ */
    window.addEventListener('storage', (e) => {
        if (['vibps_pedidos', 'vibps_eventos', 'vibps_analytics'].includes(e.key)) {
            refreshAll();
        }
    });

    /* ------------------------------------------------------------------
       INIT
    ------------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        // Botón opcional para limpiar datos demo
        $('#ad-reset-demo')?.addEventListener('click', () => {
            if (confirm('Esto borrará TODOS los pedidos, eventos y analíticas. ¿Continuar?')) {
                localStorage.removeItem('vibps_pedidos');
                localStorage.removeItem('vibps_eventos');
                localStorage.removeItem('vibps_analytics');
                seedDemoIfEmpty();
                refreshAll();
                showToast('Datos reiniciados con demo seed', 'success');
            }
        });

        seedDemoIfEmpty();
        bindSidebarNav();
        bindTableActions();
        bindEventForm();
        refreshAll();
    });

})();
