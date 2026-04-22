/**
 * JARVIS ERP — ui.js
 * Sistema Universal de UI: toast, modal, tabs, loaders, navegação, badges
 */

'use strict';

// ============================================================
// TOAST SYSTEM
// ============================================================
window.toast = function(msg, type = 'ok', title = null) {
  const icons = { ok: '✓', err: '✕', warn: '⚠', info: 'ℹ', success: '✓', error: '✕' };
  const t = (type === 'error') ? 'err' : (type === 'success' ? 'ok' : type);
  const container = document.getElementById('toastBox') || document.body;
  const el = document.createElement('div');
  el.className = `toast-j ${t}`;
  el.innerHTML = `${icons[t] || '✓'} ${msg}`;
  el.textContent = `${icons[t] || '✓'} ${msg}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3500);
};

window.toastOk   = msg => toast(msg, 'ok');
window.toastErr  = msg => toast(msg, 'err');
window.toastWarn = msg => toast(msg, 'warn');
window.toastInfo = msg => toast(msg, 'info');

// ============================================================
// MODAL SYSTEM (Adaptador Universal)
// ============================================================
window.abrirModal = window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
};

window.fecharModal = window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
};

window.fecharTodosModais = window.closeAllModals = function() {
  document.querySelectorAll('.overlay.open').forEach(el => el.classList.remove('open'));
};
@@ -85,25 +85,95 @@ window.confirmar = function(msg, titulo = 'Confirmação') {
window.tableEmpty = function(cols, icon, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;color:var(--muted);padding:24px;">${icon} ${msg}</td></tr>`;
};

window.setBadge = function(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.style.display = count > 0 ? 'block' : 'none';
};

window.badgeStatus = function(status) {
  const map = { 'Aguardando': 'pill-gray', 'Triagem': 'pill-gray', 'Orcamento': 'pill-warn', 'Orcamento_Enviado': 'pill-purple', 'Aprovado': 'pill-cyan', 'Andamento': 'pill-warn', 'Concluido': 'pill-green', 'Cancelado': 'pill-danger', 'Pago': 'pill-green', 'Pendente': 'pill-warn', 'Entregue': 'pill-green', 'Pronto': 'pill-green' };
  return `<span class="pill ${map[status] || 'pill-gray'}">${status}</span>`;
};

window.badgeTipo = function(tipo) {
  const map = { carro: ['pill-cyan', '🚗 Carro'], moto: ['pill-warn', '🏍️ Moto'], bicicleta: ['pill-green', '🚲 Bicicleta'] };
  const [cls, lbl] = map[tipo] || ['pill-gray', tipo];
  return `<span class="pill ${cls}">${lbl}</span>`;
};

window.badgeEntradaSaida = function(tipo) {
  return tipo === 'Entrada' ? `<span class="pill pill-green">${tipo}</span>` : `<span class="pill pill-danger">${tipo}</span>`;
};

window.escHtml = function(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.safeOpenExternal = function(url, target = '_blank') {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL bloqueada por protocolo inválido');
    }
    window.open(parsed.toString(), target, 'noopener,noreferrer');
    return true;
  } catch (err) {
    window.reportRuntimeError && reportRuntimeError('safeOpenExternal', err, { url });
    window.toastWarn && toastWarn('Não foi possível abrir o link externo.');
    return false;
  }
};

// ============================================================
// RUNTIME ERROR GUARD (Hardening)
// ============================================================
window.reportRuntimeError = function(contexto, err, extra = {}) {
  const payload = {
    contexto,
    mensagem: err?.message || String(err),
    stack: err?.stack || null,
    ...extra
  };
  console.error('[JARVIS][RuntimeError]', payload);
  return payload;
};

window.installGlobalErrorHandlers = function() {
  if (window.__jarvisRuntimeGuardInstalled) return;
  window.__jarvisRuntimeGuardInstalled = true;

  let lastToastAt = 0;
  const notify = (msg) => {
    const now = Date.now();
    if (now - lastToastAt < 5000) return;
    lastToastAt = now;
    window.toastWarn && toastWarn(msg);
  };

  window.addEventListener('error', (event) => {
    const err = event?.error || new Error(event?.message || 'Erro inesperado');
    reportRuntimeError('window.error', err, {
      arquivo: event?.filename || null,
      linha: event?.lineno || null,
      coluna: event?.colno || null
    });
    notify('Ocorreu um erro inesperado. Atualize a página se necessário.');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const err = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Falha assíncrona não tratada');
    reportRuntimeError('window.unhandledrejection', err);
    notify('Falha ao processar uma ação. Tente novamente.');
  });
};

window.installGlobalErrorHandlers();
