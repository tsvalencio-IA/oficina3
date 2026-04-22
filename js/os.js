/**
 * JARVIS ERP — os.js
 * Motor de Ordens de Serviço, Kanban Chevron 7 Etapas, WhatsApp B2C, Laudos PDF
 *
 * Powered by thIAguinho Soluções Digitais
 */

'use strict';

const KANBAN_STATUSES = ['Triagem', 'Orcamento', 'Orcamento_Enviado', 'Aprovado', 'Andamento', 'Pronto', 'Entregue'];
const getDB = () => {
  if (typeof window.getDB === 'function') return window.getDB();
  throw new Error('window.getDB não está disponível');
};

const STATUS_MAP_LEGACY = { 
    'Aguardando': 'Triagem', 
    'Concluido': 'Entregue', 
    'patio': 'Triagem', 
    'aprovacao': 'Orcamento_Enviado', 
    'box': 'Andamento', 
    'faturado': 'Pronto', 
    'cancelado': 'Cancelado', 
    'orcamento': 'Orcamento', 
    'pronto': 'Pronto', 
    'entregue': 'Entregue',
    'Triagem': 'Triagem',
    'Orcamento': 'Orcamento',
    'Orcamento_Enviado': 'Orcamento_Enviado',
    'Aprovado': 'Aprovado',
    'Andamento': 'Andamento',
    'Pronto': 'Pronto',
    'Entregue': 'Entregue'
};

window.escutarOS = function() {
  db.collection('ordens_servico').where('tenantId', '==', J.tid).onSnapshot(snap => {
  getDB().collection('ordens_servico').where('tenantId', '==', J.tid).onSnapshot(snap => {
    J.os = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if(typeof window.renderKanban === 'function') window.renderKanban(); 
    if(typeof window.renderDashboard === 'function') window.renderDashboard(); 
    if(typeof window.calcComissoes === 'function') window.calcComissoes();
  });
};

window.renderKanban = function() {
  const busca = ($v('searchOS') || '').toLowerCase();
  const filtroNicho = $v('filtroNichoKanban');
  const cols = {}; const cnts = {};
  KANBAN_STATUSES.forEach(s => { cols[s] = []; cnts[s] = 0; });

  J.os.filter(o => (o.status || '').toLowerCase() !== 'cancelado').forEach(o => {
    const stRaw = o.status || 'Triagem';
    const st = STATUS_MAP_LEGACY[stRaw] || 'Triagem'; 
    
    const v = J.veiculos.find(x => x.id === o.veiculoId) || { placa: o.placa, modelo: o.veiculo, tipo: o.tipoVeiculo };
    const c = J.clientes.find(x => x.id === o.clienteId) || { nome: o.cliente };
    
    if (busca && !(v.placa||'').toLowerCase().includes(busca) && !(c.nome||'').toLowerCase().includes(busca) && !(o.placa||'').toLowerCase().includes(busca)) return;
    if (filtroNicho && v.tipo !== filtroNicho) return;
    
    if (cols[st]) { cols[st].push({ os: o, v, c }); cnts[st]++; }
  });

  KANBAN_STATUSES.forEach(s => {
    const cntEl = $('cnt-' + s); if (cntEl) cntEl.innerText = cnts[s];
    const colEl = $('kb-' + s); if (!colEl) return;
    
    colEl.innerHTML = cols[s].sort((a, b) => new Date(b.os.updatedAt || 0) - new Date(a.os.updatedAt || 0)).map(({ os, v, c }) => {
      const esc = window.escHtml || (x => String(x ?? ''));
      const tipoCls = v?.tipo || 'carro';
      const tipoLabel = { carro: '🚗 CARRO', moto: '🏍️ MOTO', bicicleta: '🚲 BICICLETA' }[tipoCls] || '🚗 VEÍCULO';
      const cor = { Triagem: 'var(--muted)', Orcamento: 'var(--warn)', Orcamento_Enviado: 'var(--purple)', Aprovado: 'var(--cyan)', Andamento: '#FF8C00', Pronto: 'var(--success)', Entregue: 'var(--green2)' }[s];
      const placa = esc(os.placa || v?.placa || 'S/PLACA');
      const cliente = esc(os.cliente || c?.nome || 'Cliente não encontrado');
      const desc = esc(os.desc || os.relato || 'Sem descrição');
      
      const idx = KANBAN_STATUSES.indexOf(s);
      const sPrev = idx > 0 ? KANBAN_STATUSES[idx - 1] : null;
      const sNext = idx < KANBAN_STATUSES.length - 1 ? KANBAN_STATUSES[idx + 1] : null;
      
      const btnPrev = sPrev ? `<button onclick="event.stopPropagation(); window.moverStatusOS('${os.id}', '${sPrev}')" title="Mover para ${sPrev}" style="background:transparent;border:none;color:var(--muted2);cursor:pointer;padding:4px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 18l-6-6 6-6"/></svg></button>` : '<div></div>';
      const btnNext = sNext ? `<button onclick="event.stopPropagation(); window.moverStatusOS('${os.id}', '${sNext}')" title="Mover para ${sNext}" style="background:transparent;border:none;color:var(--muted2);cursor:pointer;padding:4px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18l6-6-6-6"/></svg></button>` : '<div></div>';

      return `<div class="k-card" style="border-left-color:${cor}" onclick="window.prepOS('edit','${os.id}');abrirModal('modalOS')">
        <div class="k-placa" style="color:${cor}">${os.placa || v?.placa || 'S/PLACA'}</div>
        <div class="k-cliente">${os.cliente || c?.nome || 'Cliente não encontrado'}</div>
        <div class="k-desc">${os.desc || os.relato || 'Sem descrição'}</div>
        <div class="k-placa" style="color:${cor}">${placa}</div>
        <div class="k-cliente">${cliente}</div>
        <div class="k-desc">${desc}</div>
        <div class="k-footer">
          <span class="k-tipo ${tipoCls}">${tipoLabel}</span>
          <span style="font-family:var(--fm);font-size:0.75rem;color:var(--success);font-weight:700;">${moeda(os.total)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:4px;">
          ${btnPrev}
          <span class="k-date">${dtBr(os.createdAt || os.data)}</span>
          ${btnNext}
        </div>
      </div>`;
    }).join('');
  });
};

window.moverStatusOS = async function(id, novoStatus) {
    await db.collection('ordens_servico').doc(id).update({ status: novoStatus, updatedAt: new Date().toISOString() });
    await getDB().collection('ordens_servico').doc(id).update({ status: novoStatus, updatedAt: new Date().toISOString() });
    window.toast(`✓ Movido para ${novoStatus.replace('_', ' ')}`);
    audit('KANBAN', `Moveu OS ${id.slice(-6)} para ${novoStatus}`);
    
    if (novoStatus === 'Orcamento_Enviado') {
        window.enviarWppB2C(id);
    }
};

window.enviarWppB2C = function(id) {
    const os = J.os.find(x => x.id === id);
    if (!os) return;

    // Busca dados REAIS do cliente no Firebase (J.clientes já carregado)
    const cli = J.clientes.find(x => x.id === os.clienteId);
    const veic = J.veiculos.find(x => x.id === os.veiculoId);

    const cel = cli?.wpp || os.celular || '';
    const cliNome = cli?.nome || os.cliente || 'Cliente';
    const veicLabel = veic ? `${veic.modelo} (${veic.placa})` : (os.veiculo || 'Veículo');

    if (!cel) { window.toast('⚠ Cliente sem WhatsApp cadastrado', 'warn'); return; }

    const fone = cel.replace(/\D/g, '');

    // ✅ Login e PIN REAIS do cadastro do cliente no Firebase
    const loginUser = cli?.login || os.placa || cliNome.split(' ')[0].toLowerCase();
    const pin = cli?.pin || os.pin || '';

    // ✅ Link correto para GitHub Pages
    const link = 'https://tsvalencio-ia.github.io/oficina1/cliente.html';
    // ✅ Link dinâmico para o portal do cliente no mesmo projeto
    const basePath = window.location.pathname.replace(/[^/]*$/, '');
    const link = `${window.location.origin}${basePath}cliente.html`;

    const totalFmt = (os.total || 0).toFixed(2).replace('.', ',');

    const msg =
        `Olá ${cliNome.split(' ')[0]}! 👋\n\n` +
        `O orçamento do seu *${veicLabel}* está pronto na *${J.tnome}*.\n\n` +
        `💰 *Total: R$ ${totalFmt}*\n\n` +
        `Acesse seu portal exclusivo para aprovar o serviço:\n` +
        `🔗 Link: ${link}\n` +
        `👤 Usuário: *${loginUser}*\n` +
        `🔑 PIN: *${pin}*\n\n` +
        `_(Em conformidade com a LGPD, seus dados estão protegidos conosco.)_`;

    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank');
    const wppUrl = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    if (window.safeOpenExternal) window.safeOpenExternal(wppUrl);
    else window.open(wppUrl, '_blank', 'noopener,noreferrer');
    window.toast('✓ Redirecionando WhatsApp B2C');
    audit('WHATSAPP', `Enviou Link/PIN para ${os.placa || veicLabel}`);
};

let mediaOSAtual = []; 
let timelineOSAtual = [];

window.prepOS = function(mode, id = null) {
  ['osId', 'osPlaca', 'osVeiculo', 'osCliente', 'osCelular', 'osCpf', 'osDiagnostico', 'osRelato', 'osDescricao', 'chkObs', 'osKm', 'osData'].forEach(f => { if ($(f)) $(f).value = ''; });
  ['chkPainel', 'chkPressao', 'chkCarroceria', 'chkDocumentos'].forEach(f => { if ($(f)) $(f).checked = false; });
  
  if ($('osStatus')) $('osStatus').value = 'Triagem';
  if ($('osTipoVeiculo')) $('osTipoVeiculo').value = 'carro';
  if ($('osData')) $('osData').value = new Date().toISOString().split('T')[0];
  if ($('containerItensOS')) $('containerItensOS').innerHTML = '';
  if ($('containerServicosOS')) $('containerServicosOS').innerHTML = '';
  if ($('containerPecasOS')) $('containerPecasOS').innerHTML = '';
  if ($('osTotalVal')) $('osTotalVal').innerText = '0,00';
  if ($('osTotalHidden')) $('osTotalHidden').value = '0';
  if ($('osMediaGrid')) $('osMediaGrid').innerHTML = ''; 
  if ($('osMediaArray')) $('osMediaArray').value = '[]';
  if ($('osTimeline')) $('osTimeline').innerHTML = ''; 
  if ($('osTimelineData')) $('osTimelineData').value = '[]';
  if ($('osIdBadge')) $('osIdBadge').innerText = 'NOVA O.S.';
  if ($('btnGerarPDFOS')) $('btnGerarPDFOS').style.display = 'none'; 
@@ -422,96 +433,96 @@ window.salvarOS = async function() {
  
  if (itens.length > 0) payload.pecasLegacy = itens;
  if (servicos.length > 0) payload.servicos = servicos;
  if (pecas.length > 0) payload.pecas = pecas;
  payload.maoObra = totalMaoObra;

  const tl = JSON.parse($('osTimelineData')?.value || '[]');
  tl.push({ dt: new Date().toISOString(), user: J.nome, acao: `${osId ? 'Editou' : 'Abriu'} O.S. — Status: ${$v('osStatus')}` });
  payload.timeline = tl;
  
  if ($('osMediaArray')) {
      payload.media = JSON.parse($('osMediaArray').value || '[]');
  }

  if (($v('osStatus') === 'Pronto' || $v('osStatus') === 'Entregue' || $v('osStatus') === 'pronto' || $v('osStatus') === 'entregue') && payload.mecId) {
      const mec = J.equipe.find(f => f.id === payload.mecId);
      if (mec) {
        const percServico = parseFloat(mec.comissaoServico || mec.comissao || 0);
        const percPeca = parseFloat(mec.comissaoPeca || 0);
        
        const valComServico = totalMaoObra * (percServico / 100);
        const valComPeca = totalPecas * (percPeca / 100);
        const valComTotal = valComServico + valComPeca;

        if (valComTotal > 0) {
            db.collection('financeiro').add({
            getDB().collection('financeiro').add({
                tenantId: J.tid, tipo: 'Saída', status: 'Pendente',
                desc: `Comissão (Serv: ${moeda(valComServico)} | Peça: ${moeda(valComPeca)}) — O.S. ${payload.placa || ''}`,
                valor: valComTotal, pgto: 'A Combinar', venc: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(), isComissao: true, mecId: payload.mecId, vinculo: `E_${payload.mecId}`
            });
        }
      }
      
      const formasPagas = ['Dinheiro', 'PIX', 'Débito', 'Crédito à Vista'];
      payload.pgtoForma = $v('osPgtoForma'); 
      payload.pgtoData = $v('osPgtoData');
      
      if(payload.pgtoForma && payload.pgtoData) {
        const statusFin = formasPagas.includes(payload.pgtoForma) ? 'Pago' : 'Pendente';
        const parcelas = parseInt($v('osPgtoParcelas') || 1);
        const valorParc = payload.total / parcelas;
        
        for (let i = 0; i < parcelas; i++) {
          const d = new Date(payload.pgtoData || new Date()); 
          d.setMonth(d.getMonth() + i);
          db.collection('financeiro').add({
          getDB().collection('financeiro').add({
            tenantId: J.tid, tipo: 'Entrada', status: statusFin,
            desc: `O.S. ${payload.placa || J.veiculos.find(v => v.id === payload.veiculoId)?.placa || ''} — ${J.clientes.find(c => c.id === payload.clienteId)?.nome || payload.cliente || ''} ${parcelas > 1 ? `(${i + 1}/${parcelas})` : ''}`,
            valor: valorParc, pgto: payload.pgtoForma, venc: d.toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          });
        }
        
        for (const p of pecas) {
          if (p.estoqueId) {
            const item = J.estoque.find(x => x.id === p.estoqueId);
            if (item) db.collection('estoqueItems').doc(p.estoqueId).update({ qtd: Math.max(0, (item.qtd || 0) - p.qtd) });
            if (item) getDB().collection('estoqueItems').doc(p.estoqueId).update({ qtd: Math.max(0, (item.qtd || 0) - p.qtd) });
          }
        }
      }
  }

  if (osId) {
    await db.collection('ordens_servico').doc(osId).update(payload);
    await getDB().collection('ordens_servico').doc(osId).update(payload);
    window.toast('✓ O.S. ATUALIZADA');
    audit('OS', `Editou OS ${osId.slice(-6)}`);
  } else {
    payload.createdAt = new Date().toISOString();
    payload.pin = Math.floor(1000 + Math.random() * 9000).toString(); 
    const ref = await db.collection('ordens_servico').add(payload);
    const ref = await getDB().collection('ordens_servico').add(payload);
    window.toast('✓ O.S. CRIADA');
    audit('OS', `Criou OS para ${payload.placa || payload.cliente || J.clientes.find(c => c.id === payload.clienteId)?.nome}`);
  }

  if(typeof window.fecharModal === 'function') window.fecharModal('modalOS');
};

// ═══════════════════════════════════════════════════════════════
// GALERIA DE PROVAS — UPLOAD LEGADO (1 por vez) — MANTIDO COMO FALLBACK
// ═══════════════════════════════════════════════════════════════
window.uploadOsMedia = async function() {
  const f = $('osFileInput')?.files[0]; if (!f) return;
  const btn = $('btnUploadMedia'); btn.innerText = 'ENVIANDO...'; btn.disabled = true;
  try {
    const fd = new FormData(); fd.append('file', f); fd.append('upload_preset', J.cloudPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${J.cloudName}/auto/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.secure_url) {
      const media = JSON.parse($('osMediaArray').value || '[]');
      media.push({ url: data.secure_url, type: data.resource_type });
      $('osMediaArray').value = JSON.stringify(media); window.renderMediaOS(); window.toast('✓ UPLOAD CONCLUÍDO');
    }
  } catch (e) { window.toast('✕ ERRO UPLOAD', 'err'); }
  btn.innerText = 'ENVIAR TODAS'; btn.disabled = false;
};
@@ -626,51 +637,51 @@ window.uploadOsMediaBatch = async function() {
  }

  // Concatena com o que já estava gravado no hidden (em caso de edição de O.S.)
  const jaSalvo = JSON.parse($('osMediaArray').value || '[]');
  const final = jaSalvo.concat(novasUrls);
  $('osMediaArray').value = JSON.stringify(final);
  window.renderMediaOS();

  // Limpa o preview local (as prévias já viraram itens reais da galeria)
  window._osBatchFiles = [];
  window.renderOsMediaPreview();

  if (btn) { btn.disabled = false; btn.innerText = 'ENVIAR TODAS'; }
  if (prog) { prog.style.display = 'none'; prog.innerText = ''; }

  if (sucesso && !falhas) window.toast(`✓ ${sucesso} arquivo(s) enviado(s). Salve a O.S. para persistir.`);
  else if (sucesso && falhas) window.toast(`⚠ ${sucesso} ok, ${falhas} falhou. Salve a O.S. para persistir o que deu certo.`, 'warn');
  else window.toast('✕ Nenhum arquivo enviado.', 'err');
};

window.renderMediaOS = function() {
  const media = JSON.parse($('osMediaArray')?.value || '[]');
  if($('osMediaGrid')) {
      $('osMediaGrid').innerHTML = media.map((m, i) => `
        <div class="media-item">
          ${m.type === 'video' ? `<video src="${m.url}" controls></video>` : `<img src="${m.url}" onclick="window.open('${m.url}')" style="cursor:zoom-in">`}
          ${m.type === 'video' ? `<video src="${m.url}" controls></video>` : `<img src="${m.url}" onclick="window.safeOpenExternal ? window.safeOpenExternal('${m.url}') : window.open('${m.url}','_blank','noopener,noreferrer')" style="cursor:zoom-in">`}
          <button class="media-del" onclick="window.removerMediaOS(${i})">✕</button>
        </div>`).join('');
  }
};

window.removerMediaOS = function(idx) {
  const media = JSON.parse($('osMediaArray').value || '[]');
  media.splice(idx, 1); $('osMediaArray').value = JSON.stringify(media); window.renderMediaOS();
};

window.renderTimelineOS = function() {
  if(!$('osTimeline')) return;
  const tl = JSON.parse($('osTimelineData')?.value || '[]');
  $('osTimeline').innerHTML = [...tl].reverse().map(e => `<div class="tl-item"><div class="tl-date">${dtHrBr(e.dt)}</div><div class="tl-user">${e.user}</div><div class="tl-action">${e.acao}</div></div>`).join('');
};

window.gerarPDFOS = async function() {
  if (typeof window.jspdf === 'undefined') { window.toast('⚠ jsPDF não carregado', 'err'); return; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth(); let y = 15;
  
  doc.setFillColor(6, 10, 20); doc.rect(0, 0, pw, 35, 'F');
  doc.setTextColor(0, 212, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('J.A.R.V.I.S — LAUDO TÉCNICO', pw / 2, 18, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(200, 200, 200);
