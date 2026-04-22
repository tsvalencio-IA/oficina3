window.salvarOS = async function() {
  // 🔒 LOCK: Previne double-submit e concorrência (Etapa 1)
  const btnSalvar = document.querySelector('[onclick*="salvarOS"]') || $('btnSalvarOS');
  if (btnSalvar && btnSalvar.dataset.saving === '1') return;
  if (btnSalvar) { btnSalvar.dataset.saving = '1'; btnSalvar.style.opacity = '0.6'; }

  try {
  const osId = $v('osId');
  if ($('osPlaca') && !$v('osPlaca')) { window.toast('⚠ Preencha a Placa', 'warn'); return; }
  if ($('osCliente') && $('osVeiculo') && !$v('osCliente') && !$v('osVeiculo')) { window.toast('⚠ Selecione cliente e veículo', 'warn'); return; }

  const itens = [];
  document.querySelectorAll('#containerItensOS > div').forEach(div => {
    const desc = div.querySelector('.os-item-desc').value.trim();
    const q = parseFloat(div.querySelector('.os-item-qtd').value || 0);
    const v = parseFloat(div.querySelector('.os-item-venda').value || 0);
    const t = div.querySelector('.os-item-tipo').value;
    if (desc && q > 0) itens.push({ desc, q, v, t });
  });

  const servicos = []; 
  let totalMaoObra = 0;
  document.querySelectorAll('#containerServicosOS > div').forEach(row => {
    const desc = row.querySelector('.serv-desc')?.value || '';
    const valor = parseFloat(row.querySelector('.serv-valor')?.value || 0);
    if (desc || valor > 0) { servicos.push({ desc, valor }); totalMaoObra += valor; }
  });

  const pecas = [];
  let totalPecas = 0;
  document.querySelectorAll('#containerPecasOS > div').forEach(row => {
    const sel = row.querySelector('.peca-sel'); 
    const opt = sel?.options[sel.selectedIndex];
    const qtd = parseFloat(row.querySelector('.peca-qtd')?.value || 1);
    const venda = parseFloat(row.querySelector('.peca-venda')?.value || 0);
    const custo = parseFloat(row.querySelector('.peca-custo')?.value || 0);
    totalPecas += (qtd * venda);
    
    pecas.push({
      estoqueId: sel?.value, 
      desc: opt?.dataset.desc || opt?.text || '',
      qtd: qtd, custo: custo, venda: venda
    });
  });

  const totalFormatado = $('osTotalVal') ? $('osTotalVal').innerText.replace(',', '.') : 0;
  const total = parseFloat(totalFormatado);

  // 🔍 CORREÇÃO CIRÚRGICA: Fallback seguro de placa + IDs consistentes (Etapa 1)
  let _placaDom = $v('osPlaca');
  if (!_placaDom && $('osVeiculo') && $('osVeiculo').tagName === 'SELECT') {
    const _veicRef = J.veiculos.find(v => v.id === $v('osVeiculo'));
    if (_veicRef?.placa) _placaDom = _veicRef.placa;
  }
  
  const payload = {
    tenantId: J.tid,
    status: $v('osStatus'),
    total: total,
    updatedAt: new Date().toISOString()
  };

  if (_placaDom) payload.placa = _placaDom.toUpperCase();
  if ($v('osVeiculo')) payload.veiculo = $v('osVeiculo');
  if ($('osVeiculo') && $('osVeiculo').tagName === 'SELECT') payload.veiculoId = $v('osVeiculo');
  if ($v('osCliente')) payload.cliente = $v('osCliente');
  if ($('osCliente') && $('osCliente').tagName === 'SELECT') payload.clienteId = $v('osCliente');
  if ($v('osCelular')) payload.celular = $v('osCelular');
  if ($v('osCpf')) payload.cpf = $v('osCpf');
  if ($v('osDiagnostico')) payload.diagnostico = $v('osDiagnostico');
  if ($v('osRelato')) payload.relato = $v('osRelato');
  if ($v('osDescricao')) payload.desc = $v('osDescricao');
  if ($v('osMec')) payload.mecId = $v('osMec');
  if ($v('osData')) payload.data = $v('osData');
  if ($v('osKm')) payload.km = $v('osKm');
  
  if (itens.length > 0) payload.pecasLegacy = itens;
  if (servicos.length > 0) payload.servicos = servicos;
  if (pecas.length > 0) payload.pecas = pecas;
  payload.maoObra = totalMaoObra;

  // Lógica dos Checklists
  if ($('chkComb')) payload.chkComb = $v('chkComb');
  if ($('chkPneuDia')) payload.chkPneuDia = $v('chkPneuDia');
  if ($('chkPneuTra')) payload.chkPneuTra = $v('chkPneuTra');
  if ($('chkObs')) payload.chkObs = $v('chkObs');
  if ($('chkPainel')) payload.chkPainel = $('chkPainel').checked;
  if ($('chkPressao')) payload.chkPressao = $('chkPressao').checked;
  if ($('chkCarroceria')) payload.chkCarroceria = $('chkCarroceria').checked;
  if ($('chkDocumentos')) payload.chkDocumentos = $('chkDocumentos').checked;

  if ($('osMediaArray')) {
      payload.media = JSON.parse($('osMediaArray').value || '[]');
  }

  // --- LÓGICA FORENSE DE COMPARAÇÃO DE DADOS (LINHA DO TEMPO) ---
  const tl = JSON.parse($('osTimelineData')?.value || '[]');
  const funcUser = J.nome || 'Mecânico/Gestor';

  if (osId) {
      const oldOS = J.os.find(x => x.id === osId) || {};
      let registouAlgo = false;

      // 1. Mudança de Status
      if (oldOS.status !== payload.status) {
          tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Status alterado para: ${(typeof STATUS_MAP_LEGACY !== 'undefined' && STATUS_MAP_LEGACY[payload.status]) || payload.status }` });
          registouAlgo = true;
      }

      // 2. Mudança de Diagnóstico (Captura o texto exato)
      const oldDiag = (oldOS.diagnostico || '').trim();
      const novoDiag = (payload.diagnostico || '').trim();
      if (novoDiag && novoDiag !== oldDiag) {
          tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Diagnóstico Técnico preenchido/atualizado: "${novoDiag}"` });
          registouAlgo = true;
      }

      // 3. Verificação Individual de Checklist
      const mapCheck = { 
          chkPainel: 'Painel/Instrumentos', 
          chkPressao: 'Pressão dos Pneus', 
          chkCarroceria: 'Carroceria/Pintura', 
          chkDocumentos: 'Documentos' 
      };
      
      ['chkPainel', 'chkPressao', 'chkCarroceria', 'chkDocumentos'].forEach(chk => {
          const oldVal = oldOS[chk] || false;
          const newVal = payload[chk] || false;
          if (oldVal !== newVal) {
              const estado = newVal ? 'Marcou' : 'Desmarcou';
              tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `${estado} o item de inspeção: ${mapCheck[chk]}` });
              registouAlgo = true;
          }
      });

      // 4. Identificação de Novas Peças Adicionadas
      const oldPecasDesc = (oldOS.pecas || []).map(p => (p.desc || '').toLowerCase().trim());
      (payload.pecas || []).forEach(p => {
          if(p.desc && !oldPecasDesc.includes(p.desc.toLowerCase().trim())) {
              tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Adicionou peça: ${p.desc} (Qtd: ${p.qtd})` });
              registouAlgo = true;
          }
      });

      // 5. Identificação de Novos Serviços Adicionados
      const oldServsDesc = (oldOS.servicos || []).map(s => (s.desc || '').toLowerCase().trim());
      (payload.servicos || []).forEach(s => {
          if(s.desc && !oldServsDesc.includes(s.desc.toLowerCase().trim())) {
              tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Adicionou serviço: ${s.desc}` });
              registouAlgo = true;
          }
      });

      // 6. Novas Fotos/Evidências
      const oldMediaLength = (oldOS.media || oldOS.fotos || []).length;
      const newMediaLength = (payload.media || []).length;
      if (newMediaLength > oldMediaLength) {
          const adicionadas = newMediaLength - oldMediaLength;
          tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Anexou ${adicionadas} nova(s) foto(s)/vídeo(s) de evidência.` });
          registouAlgo = true;
      }

      // Fallback genérico caso tenha havido uma edição noutros campos (como a KM)
      if (!registouAlgo && oldOS.updatedAt !== payload.updatedAt) {
          tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Detalhes da Ordem de Serviço foram atualizados.` });
      }
      
  } else {
      // Criação de Nova O.S.
      tl.push({ dt: new Date().toISOString(), user: funcUser, acao: `Deu entrada no veículo e abriu a O.S. (Status: ${(typeof STATUS_MAP_LEGACY !== 'undefined' && STATUS_MAP_LEGACY[payload.status]) || payload.status})` });
  }

  payload.timeline = tl;
  // --- FIM DA AUDITORIA FORENSE ---

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
          }
        }
      }
  }

  if (osId) {
    await db.collection('ordens_servico').doc(osId).update(payload);
    window.toast('✓ O.S. ATUALIZADA');
    audit('OS', `Editou OS ${osId.slice(-6)}`);
  } else {
    payload.createdAt = new Date().toISOString();
    payload.pin = Math.floor(1000 + Math.random() * 9000).toString(); 
    const ref = await db.collection('ordens_servico').add(payload);
    window.toast('✓ O.S. CRIADA');
    audit('OS', `Criou OS para ${payload.placa || payload.cliente || J.clientes.find(c => c.id === payload.clienteId)?.nome}`);
  }

  if(typeof window.fecharModal === 'function') window.fecharModal('modalOS');
  } finally {
    // 🔓 UNLOCK: Libera botão independente de sucesso, erro ou return antecipado
    if (btnSalvar) { btnSalvar.dataset.saving = '0'; btnSalvar.style.opacity = ''; }
  }
};
