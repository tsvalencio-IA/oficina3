/**
 * JARVIS ERP — ia.js
 * Gemini AI Integration with Advanced Auditory & History (24 months)
 * + RAG de Manuais + Radar de Revisões / Remarketing
 *
 * Powered by thIAguinho Soluções Digitais
 */
'use strict';

window.iaHistorico = [];

// ─── RAG: Base de Conhecimento Local ────────────────────────
// Documentos/manuais injetados ficam aqui para enriquecer o contexto
window.iaBaseConhecimento = [];

window.iaCarregarBaseConhecimento = async function() {
    if (!window.J?.tid) return;
    try {
        const snap = await db.collection('ia_conhecimento').where('tenantId', '==', J.tid).get();
        window.iaBaseConhecimento = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.renderListaConhecimentos();
    } catch(e) { console.warn('Erro ao carregar base IA:', e); }
};

window.salvarConhecimentoIA = async function() {
    const txt = document.getElementById('iaConhecimentoTexto')?.value?.trim();
    if (!txt) { window.toast('⚠ Digite ou cole o conteúdo para salvar', 'warn'); return; }
    try {
        await db.collection('ia_conhecimento').add({
            tenantId: J.tid, conteudo: txt,
            origem: 'Manual',
            createdAt: new Date().toISOString(),
            criadoPor: J.nome
        });
        window.toast('✓ Conhecimento gravado na memória da IA!');
        if (document.getElementById('iaConhecimentoTexto')) document.getElementById('iaConhecimentoTexto').value = '';
        window.iaCarregarBaseConhecimento();
        audit('IA', 'Injetou novo conhecimento na base RAG');
    } catch(e) { window.toast('✕ Erro: ' + e.message, 'err'); }
};

window.processarArquivoParaIA = function(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const statusEl = document.getElementById('iaFileStatus');
    if (statusEl) { statusEl.className = 'text-warn'; statusEl.innerText = `Lendo ${file.name}...`; }
    const reader = new FileReader();
    reader.onload = async function(e) {
        const txtLimpo = e.target.result.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (document.getElementById('iaConhecimentoTexto'))
            document.getElementById('iaConhecimentoTexto').value = `[ARQUIVO: ${file.name}]\n\n${txtLimpo.substring(0, 8000)}`;
        if (statusEl) { statusEl.className = 'text-success'; statusEl.innerText = `✓ ${file.name} lido. Clique em GRAVAR NA MENTE.`; }
    };
    reader.onerror = () => { if(statusEl) statusEl.innerText = '✕ Erro ao ler arquivo'; };
    reader.readAsText(file, 'UTF-8');
};

window.deletarConhecimento = async function(id) {
    if (!confirm('Remover este documento da memória da IA?')) return;
    await db.collection('ia_conhecimento').doc(id).delete();
    window.toast('✓ Removido da base de conhecimento');
    window.iaCarregarBaseConhecimento();
};

window.renderListaConhecimentos = function() {
    const el = document.getElementById('listaConhecimentosIA'); if (!el) return;
    if (!window.iaBaseConhecimento.length) {
        el.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;text-align:center;padding:16px;">A Mente Cognitiva (RAG) está vazia. Importe dados.</p>';
        return;
    }
    el.innerHTML = window.iaBaseConhecimento.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--surf2);border:1px solid var(--border);border-radius:4px;margin-bottom:6px;">
            <div>
                <div style="font-size:0.82rem;font-weight:700;color:var(--text);">${d.origem || 'Manual'}</div>
                <div style="font-family:var(--fm);font-size:0.62rem;color:var(--muted);">${new Date(d.createdAt).toLocaleString('pt-BR')} — ${d.criadoPor || '?'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${(d.conteudo||'').substring(0,100)}...</div>
            </div>
            <button class="btn-danger" onclick="window.deletarConhecimento('${d.id}')" style="padding:6px 10px;white-space:nowrap;">✕</button>
        </div>
    `).join('');
};

// ─── RADAR DE REVISÕES (REMARKETING) ────────────────────────
window.iaRadarRevisoes = async function() {
    const key = window.J?.gemini;
    const el = document.getElementById('jarvisRadarResultado');
    if (!key) { if(el) el.innerHTML = '<span style="color:var(--danger)">⚠ Chave Gemini não configurada.</span>'; return; }
    if (!el) { window.iaChip('Analise os clientes em atraso para revisão. Quem não retorna há mais de 90 dias? Liste nome, placa, última visita e sugestão de mensagem de reativação.'); return; }

    el.innerHTML = '<span class="j-spinner"></span> Rastreando clientes...';

    const agora = new Date();
    const clientesParaReativar = [];

    J.clientes.forEach(c => {
        const osCliente = J.os.filter(o => o.clienteId === c.id).sort((a,b) => new Date(b.updatedAt||b.createdAt||0) - new Date(a.updatedAt||a.createdAt||0));
        const ultimaOS = osCliente[0];
        if (!ultimaOS) return;
        const diasSemVisita = Math.floor((agora - new Date(ultimaOS.updatedAt||ultimaOS.createdAt||0)) / (1000*60*60*24));
        if (diasSemVisita > 60) {
            const veics = J.veiculos.filter(v => v.clienteId === c.id);
            clientesParaReativar.push({ nome: c.nome, wpp: c.wpp, diasSemVisita, ultimoServico: ultimaOS.desc || '?', placa: veics[0]?.placa || ultimaOS.placa || '?', total: ultimaOS.total || 0 });
        }
    });

    if (!clientesParaReativar.length) { el.innerHTML = '✅ Nenhum cliente em atraso! Todos retornaram nos últimos 60 dias.'; return; }

    const ctx = clientesParaReativar.slice(0, 20).map(x => `${x.nome} | Placa: ${x.placa} | ${x.diasSemVisita} dias sem visita | Último serviço: ${x.ultimoServico}`).join('\n');
    const prompt = `Você é o thIAguinho da ${J.tnome}.\n\nClientes que não retornam há mais de 60 dias:\n${ctx}\n\nPara cada cliente, crie uma mensagem curta e personalizada de WhatsApp para reativação. Seja caloroso, profissional e cite o veículo/placa.`;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ contents: [{ role:'user', parts:[{text: prompt}] }] })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Erro API');
        const resp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        el.innerHTML = '<div style="font-size:0.82rem;line-height:1.7;">' + resp.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') + '</div>';
        audit('IA', `Rodou Radar de Revisões — ${clientesParaReativar.length} clientes em atraso`);
    } catch(e) {
        el.innerHTML = `<span style="color:var(--danger)">✕ Erro: ${e.message}</span>`;
    }
};

window.iaPerguntar = async function() {
  const msg = window._v ? window._v('iaInput') : (document.getElementById('iaInput')?.value.trim() || '');
  if(!msg) return;
  if(window._sv) window._sv('iaInput',''); else { const el=document.getElementById('iaInput'); if(el) el.value=''; }

  window.adicionarMsgIA('user', msg);
  window.adicionarMsgIA('bot', '<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid var(--cyan);border-right-color:transparent;border-radius:50%;animation:jspin 0.8s linear infinite;vertical-align:middle;margin-right:6px;"></span> Acessando base de dados...');

  const key = window.J && window.J.gemini;
  if(!key || !String(key).trim()){
    // Mensagem honesta: explica exatamente O QUE ESTÁ FALTANDO e COMO RESOLVER
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    
    const role = (window.J && window.J.role) || '';
    let instr = '';
    if(role === 'admin' || role === 'superadmin'){
      instr = '<br><br><strong>Como resolver:</strong><br>' +
              '1. Entre no Firebase Console → Firestore Database<br>' +
              '2. Coleção <code>oficinas</code> → documento da sua oficina<br>' +
              '3. Adicione o campo <code>apiKeys.gemini</code> (tipo: map) com sua chave Gemini<br>' +
              '4. Pegue uma chave grátis em <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--cyan);text-decoration:underline">aistudio.google.com/app/apikey</a><br>' +
              '5. Faça logout e login novamente para recarregar a chave na sessão.';
    } else {
      instr = '<br><br>Peça ao administrador da oficina para configurar a chave Gemini no Firestore (campo <code>apiKeys.gemini</code> da coleção <code>oficinas</code>).';
    }
    window.adicionarMsgIA('bot', '⚠ <strong>Chave Gemini não configurada.</strong>' + instr);
    if(window.toast) window.toast('⚠ Configure a chave Gemini para ativar a IA', 'warn');
    return;
  }

  if(!window.J || !Array.isArray(window.J.os)){
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    window.adicionarMsgIA('bot', '⚠ Base de dados ainda carregando. Aguarde alguns segundos e tente novamente.');
    return;
  }

  // 1. INJEÇÃO DA MEMÓRIA GLOBAL DO GESTOR (Últimos 24 meses + Estoque + Contexto de Auditoria)
  let historyContext = "BASE DE DADOS DE SERVIÇOS DA OFICINA (Últimos 24 meses):\n";
  const limiteData = new Date();
  limiteData.setMonth(limiteData.getMonth() - 24);

  window.J.os.filter(o => {
      const dataOS = new Date(o.createdAt || o.data || o.updatedAt || Date.now());
      return dataOS > limiteData;
  }).forEach(o => {
      const v = (window.J.veiculos || []).find(x => x.id === o.veiculoId);
      historyContext += `[OS #${o.id.slice(-5).toUpperCase()} | Placa: ${v?.placa || o.placa || 'S/P'} | Data: ${o.data || 'N/A'} | Status: ${o.status}]\n`;
      historyContext += `- Relato/Diag: ${o.desc || 'N/A'} | ${o.diagnostico || 'N/A'}\n`;
      if (o.pecas && o.pecas.length > 0) historyContext += `- Peças Trocadas: ${o.pecas.map(p => p.desc).join(', ')}\n`;
      if (o.servicos && o.servicos.length > 0) historyContext += `- Serviços Executados: ${o.servicos.map(s => s.desc).join(', ')}\n`;
      historyContext += `- Valor Total: R$ ${o.total || 0}\n\n`;
  });

  const infoOficina = `Oficina: ${window.J.tnome}. Mecânicos ativos: ${(window.J.equipe||[]).map(f=>f.nome).join(', ') || '—'}. Veículos cadastrados: ${(window.J.veiculos||[]).length}. Peças críticas (abaixo do mínimo): ${(window.J.estoque||[]).filter(p=>(p.qtd||0)<=(p.min||0)).map(p=>p.desc).join(', ') || 'nenhuma'}.`;

  // 2. O PROMPT MESTRE (AUDITORIA E CONSULTORIA SÊNIOR — PADRÃO DOUTOR-IE / BOSCH PRO)
  // Injeta base de conhecimento RAG (manuais/documentos injetados pelo gestor)
  let ragContext = '';
  if (window.iaBaseConhecimento && window.iaBaseConhecimento.length > 0) {
      ragContext = '\n\n=== BASE DE MANUAIS E REGRAS TÉCNICAS (RAG) ===\n';
      window.iaBaseConhecimento.slice(0, 5).forEach(doc => {
          ragContext += `[${doc.origem}]: ${(doc.conteudo || '').substring(0, 1000)}\n\n`;
      });
      ragContext += '=== FIM DO RAG ===\n\nSe a pergunta envolver dados dos manuais acima, CITE a fonte. Priorize o RAG para torques, especificações e procedimentos.';
  }

  const systemPrompt = `Você é o thIAguinho, o JARVIS Gestor Automotivo de alto nível.
Seu conhecimento técnico é padrão Doutor-IE e Bosch Mecânico Pro. Seu conhecimento analítico é nível Diretor Operacional SaaS.
Você ajuda o gestor da oficina a analisar lucratividade, investigar orçamentos e AUDITAR GARANTIAS.

DIRETRIZES DE AUDITORIA (EXTREMAMENTE IMPORTANTE):
1. Utilize a "BASE DE DADOS DE SERVIÇOS" fornecida abaixo para todas as respostas referentes a veículos e clientes específicos.
2. Se questionado sobre a quebra de uma peça ou diagnóstico de um carro (placa), VOCÊ É OBRIGADO a varrer a base de dados e verificar se essa placa já esteve na oficina e se essa peça já foi trocada anteriormente.
3. REGRAS DE GARANTIA PADRÃO DO MERCADO BRASILEIRO:
   - Amortecedores: 2 anos ou 50.000 km.
   - Kits de Amortecedor (batente, coifa, coxim): 3 meses ou 10.000 km.
   - Pastilhas e Discos de freio: 3 meses ou 5.000 km.
   - Motor/Injeção/Sensores: 3 meses (garantia legal).
4. ALERTE O GESTOR IMEDIATAMENTE (em negrito e destaque) caso identifique que um mecânico está pedindo para trocar algo que ainda esteja na garantia com base no histórico.
5. Explique tecnicamente por que a peça pode ter falhado prematuramente (reincidência) citando causas-raiz prováveis para evitar prejuízos à oficina.
6. Se for uma análise financeira ou de estoque, forneça insights diretos baseados nos dados do "Cenário Atual".

Cenário Atual da Oficina: ${infoOficina}

${historyContext}
${ragContext}

Responda sempre em português do Brasil, de forma clínica, técnica e sem alucinar dados não existentes na base.`;

  window.iaHistorico.push({role: 'user', text: msg});

  try {
    const contents = window.iaHistorico.map(h => ({role: h.role === 'user' ? 'user' : 'model', parts: [{text: h.text}]}));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
          contents, 
          systemInstruction: {parts: [{text: systemPrompt}]}
      })
    });

    const data = await res.json();
    if(!res.ok){
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      let dica = '';
      if(/API key not valid|API_KEY_INVALID/i.test(errMsg)) dica = '<br><br>A chave Gemini configurada é inválida ou expirou. Gere uma nova em <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--cyan);text-decoration:underline">aistudio.google.com/app/apikey</a>.';
      else if(/quota|RESOURCE_EXHAUSTED/i.test(errMsg)) dica = '<br><br>Cota da chave Gemini esgotada. Aguarde o reset ou gere nova chave.';
      else if(/models\/gemini/i.test(errMsg) && /not found/i.test(errMsg)) dica = '<br><br>O modelo <code>gemini-2.0-flash</code> pode não estar disponível na sua região.';
      throw new Error(errMsg + dica);
    }

    const resp = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
    window.iaHistorico.push({role: 'model', text: resp});

    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    
    window.adicionarMsgIA('bot', resp.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>'));
  } catch(e) {
    const lastBotMsg = document.getElementById('iaMsgs').lastChild;
    if(lastBotMsg) lastBotMsg.remove();
    window.adicionarMsgIA('bot', '⚠ Erro na IA: ' + (e.message || e));
  }
};

window.iaAnalisarDRE = function() {
  if(window._sv) window._sv('iaInput', 'Analise o financeiro atual e sugira melhorias e projeções.');
  else { const el=document.getElementById('iaInput'); if(el) el.value='Analise o financeiro atual e sugira melhorias e projeções.'; }
  if(window.ir) window.ir('ia');
  setTimeout(window.iaPerguntar, 200);
};

window.iaAnalisarEstoque = function() {
  if(window._sv) window._sv('iaInput', 'Quais peças estão em nível crítico para reposição? Sugira ações de compra.');
  else { const el=document.getElementById('iaInput'); if(el) el.value='Quais peças estão em nível crítico para reposição? Sugira ações de compra.'; }
  if(window.ir) window.ir('ia');
  setTimeout(window.iaPerguntar, 200);
};

window.adicionarMsgIA = function(role, html) {
  const el = document.getElementById('iaMsgs'); if(!el) return;
  const div = document.createElement('div'); div.className = 'ia-msg ' + role;
  if(role === 'bot') div.innerHTML = '<strong>thIAguinho:</strong> ' + html; else div.innerHTML = html;
  el.appendChild(div); el.scrollTop = el.scrollHeight;
};

document.getElementById('iaInput')?.addEventListener('keydown', e => {
  if(e.key === 'Enter') window.iaPerguntar();
});

/* Powered by thIAguinho Soluções Digitais */