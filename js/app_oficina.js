// =====================================================================
// 7. ABERTURA E EDIÇÃO DO PRONTUÁRIO O.S. 
// =====================================================================
app.verificarStatusLink = function() {
    const a = document.getElementById('alertaLinkCliente'); if(!a) return;
    if (document.getElementById('os_status') && document.getElementById('os_status').value === 'aprovacao' && document.getElementById('os_id').value) a.classList.remove('d-none'); else a.classList.add('d-none');
};

app.abrirModalOS = function(mode = 'nova', id = '') {
    const frm = document.getElementById('formOS'); if(frm) frm.reset();
    if(document.getElementById('listaPecasCorpo')) document.getElementById('listaPecasCorpo').innerHTML = ''; 
    app.fotosOSAtual = []; app.historicoOSAtual = [];
    if(document.getElementById('header_placa')) document.getElementById('header_placa').innerText = '';
    if(document.getElementById('listaHistorico')) document.getElementById('listaHistorico').innerHTML = '';
    
    const btnFat = document.getElementById('btnFaturar'); if(btnFat) btnFat.classList.add('d-none');
    const btnPdf = document.getElementById('btnGerarPDF'); if(btnPdf) btnPdf.classList.add('d-none');
    const btnDel = document.getElementById('btnDeletarOS'); if(btnDel) btnDel.classList.add('d-none');
    ['chk_combustivel', 'chk_arranhado', 'chk_bateria', 'chk_pneus'].forEach(i => { const chk = document.getElementById(i); if(chk) chk.checked = false; });

    if (mode === 'edit') {
        const os = app.bancoOSCompleto.find(x => x.id === id);
        if (os) {
            if(document.getElementById('os_id')) document.getElementById('os_id').value = os.id;
            if(document.getElementById('os_placa')) document.getElementById('os_placa').value = os.placa || '';
            if(document.getElementById('header_placa')) document.getElementById('header_placa').innerText = `[${os.placa}]`;
            if(document.getElementById('os_veiculo')) document.getElementById('os_veiculo').value = os.veiculo || '';
            if(document.getElementById('os_cliente')) document.getElementById('os_cliente').value = os.cliente || '';
            if(document.getElementById('os_cliente_cpf')) document.getElementById('os_cliente_cpf').value = os.clienteCpf || '';
            if(document.getElementById('os_celular')) document.getElementById('os_celular').value = os.celular || '';
            if(document.getElementById('os_status')) document.getElementById('os_status').value = os.status || 'patio';
            if(document.getElementById('os_relato_cliente')) document.getElementById('os_relato_cliente').value = os.relatoCliente || '';
            if(document.getElementById('os_diagnostico')) document.getElementById('os_diagnostico').value = os.diagnostico || '';
            if(os.chk_combustivel && document.getElementById('chk_combustivel')) document.getElementById('chk_combustivel').checked = true;
            if(os.chk_arranhado && document.getElementById('chk_arranhado')) document.getElementById('chk_arranhado').checked = true;
            if(os.chk_bateria && document.getElementById('chk_bateria')) document.getElementById('chk_bateria').checked = true;
            if(os.chk_pneus && document.getElementById('chk_pneus')) document.getElementById('chk_pneus').checked = true;
            
            if (os.fotos) { app.fotosOSAtual = os.fotos; app.renderizarGaleria(); }
            if (os.historico) { app.historicoOSAtual = os.historico; app.renderizarHistorico(); }
            if (os.pecas && Array.isArray(os.pecas)) { os.pecas.forEach(p => app.adicionarLinhaPeca(p.desc, p.ncm||'', p.qtd, p.custo, p.venda, p.idEstoque, p.isMaoObra)); }
            
            if(btnPdf) btnPdf.classList.remove('d-none');
            if (os.status === 'pronto' && (app.t_role === 'admin' || app.t_role === 'gerente') && btnFat) btnFat.classList.remove('d-none');
            if (app.t_role === 'admin' && btnDel) btnDel.classList.remove('d-none');
        }
    } else { app.adicionarMaoDeObra(); }
    app.verificarStatusLink(); const mod = document.getElementById('modalOS'); if(mod) new bootstrap.Modal(mod).show();
};

app.adicionarDoEstoque = function() {
    const sel = document.getElementById('selectProdutoEstoque'); if(!sel || !sel.value) return; const opt = sel.options[sel.selectedIndex];
    app.adicionarLinhaPeca(opt.dataset.desc, opt.dataset.ncm, 1, parseFloat(opt.dataset.custo), parseFloat(opt.dataset.venda), sel.value, false); sel.value = '';
};

app.adicionarMaoDeObra = function() { app.adicionarLinhaPeca("Mão de Obra / Serviço", "-", 1, 0, 0, null, true); };

app.adicionarLinhaPeca = function(desc, ncm, qtd, custo, venda, idEstoque, isMaoObra) {
    const tr = document.createElement('tr'); const mo = isMaoObra ? `data-maoobra="true"` : ''; const est = idEstoque ? `data-idestoque="${idEstoque}" readonly` : '';
    tr.innerHTML = `<td><input type="text" class="form-control form-control-sm bg-dark text-white border-secondary peca-desc p-2" value="${desc}" ${est} ${mo}></td>
        <td><span class="text-white-50 small d-block">NCM: ${ncm||'-'}</span></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-white border-secondary peca-qtd p-2" value="${qtd}" min="1" onchange="app.calcularTotalOS()"></td>
        <td class="gestao-only"><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-danger border-secondary peca-custo p-2" value="${custo}" onchange="app.calcularTotalOS()"></td>
        <td><input type="number" step="0.01" class="form-control form-control-sm bg-dark text-success border-secondary peca-venda p-2 fw-bold" value="${venda}" onchange="app.calcularTotalOS()"></td>
        <td><input type="text" class="form-control form-control-sm bg-black text-white border-0 peca-total fw-bold p-2" readonly value="${(qtd*venda).toFixed(2)}"></td>
        <td class="text-center" data-html2canvas-ignore><button type="button" class="btn btn-sm btn-outline-danger border-0 mt-1" onclick="this.closest('tr').remove(); app.calcularTotalOS()"><i class="bi bi-trash"></i></button></td>`;
    const tb = document.getElementById('listaPecasCorpo'); if(tb) tb.appendChild(tr); app.calcularTotalOS();
};

app.calcularTotalOS = function() {
    let t = 0; let tc = 0; let tMO = 0; let tPecas = 0;
    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const descInput = tr.querySelector('.peca-desc'); const isMaoObra = descInput ? descInput.dataset.maoobra === "true" : false;
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||0; const v = parseFloat(tr.querySelector('.peca-venda').value)||0; const c = parseFloat(tr.querySelector('.peca-custo').value)||0;
        const totElem = tr.querySelector('.peca-total'); if(totElem) totElem.value = (q*v).toFixed(2);
        t += (q*v); tc += (q*c); if(isMaoObra) tMO += (q*v); else tPecas += (q*v);
    });
    const divGeral = document.getElementById('os_total_geral'); if(divGeral) divGeral.innerText = `R$ ${t.toFixed(2).replace('.',',')}`;
    return { total: t, custo: tc, maoObra: tMO, pecas: tPecas };
};

app.salvarOS = async function() {
    const idElem = document.getElementById('os_id'); const id = idElem ? idElem.value : '';
    let pecasArray = []; const metricasTotais = app.calcularTotalOS(); 
    const cpfField = document.getElementById('os_cliente_cpf'); const cpfOS = cpfField ? cpfField.value : '';
    const cliElem = document.getElementById('os_cliente'); const clienteOS = cliElem ? cliElem.value.trim() : '';
    const telElem = document.getElementById('os_celular'); const telOS = telElem ? telElem.value.trim() : '';

    let cId = '';
    if(clienteOS && !app.bancoCrm.find(c => c.nome.toLowerCase() === clienteOS.toLowerCase())) {
        const d = await app.db.collection('clientes_base').add({ tenantId: app.t_id, nome: clienteOS, telefone: telOS, documento: cpfOS, anotacoes: "Criado via O.S." }); cId = d.id;
    } else { const cExist = app.bancoCrm.find(c => c.nome.toLowerCase() === clienteOS.toLowerCase()); if(cExist) cId = cExist.id; }

    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const descInput = tr.querySelector('.peca-desc'); const desc = descInput ? descInput.value.trim() : '';
        const idEstoque = descInput ? descInput.dataset.idestoque || null : null; const isMaoObra = descInput ? descInput.dataset.maoobra === "true" : false;
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||1; const c = parseFloat(tr.querySelector('.peca-custo').value)||0; const v = parseFloat(tr.querySelector('.peca-venda').value)||0;
        if (desc !== '') { pecasArray.push({ desc, qtd:q, custo:c, venda:v, idEstoque, isMaoObra }); }
    });
    
    const novoStatus = document.getElementById('os_status') ? document.getElementById('os_status').value : 'patio';
    
    if(novoStatus === 'box' && id) {
         const oldData = app.bancoOSCompleto.find(o => o.id === id);
         if(oldData && oldData.status !== 'box' && (!oldData.mecanicoAtribuido || !oldData.boxAtribuido)) {
             app.iniciarAtribuicaoBox(id);
             return;
         }
    }

    app.historicoOSAtual.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: id ? `Editou o orçamento/evidências. Status: ${novoStatus.toUpperCase()}` : "Abriu a Ficha (Pátio)." });
    
    const payload = {
        tenantId: app.t_id, placa: document.getElementById('os_placa') ? document.getElementById('os_placa').value.toUpperCase() : '', veiculo: document.getElementById('os_veiculo') ? document.getElementById('os_veiculo').value : '', cliente: clienteOS, clienteId: cId, celular: telOS, clienteCpf: cpfOS, status: novoStatus, relatoCliente: document.getElementById('os_relato_cliente') ? document.getElementById('os_relato_cliente').value : '', diagnostico: document.getElementById('os_diagnostico') ? document.getElementById('os_diagnostico').value : '', chk_combustivel: document.getElementById('chk_combustivel') ? document.getElementById('chk_combustivel').checked : false, chk_arranhado: document.getElementById('chk_arranhado') ? document.getElementById('chk_arranhado').checked : false, chk_bateria: document.getElementById('chk_bateria') ? document.getElementById('chk_bateria').checked : false, chk_pneus: document.getElementById('chk_pneus') ? document.getElementById('chk_pneus').checked : false, pecas: pecasArray, total: metricasTotais.total, custoTotal: metricasTotais.custo, maoObraTotal: metricasTotais.maoObra, pecasTotal: metricasTotais.pecas, fotos: app.fotosOSAtual, historico: app.historicoOSAtual, ultimaAtualizacao: new Date().toISOString()
    };
    
    if (novoStatus === 'entregue') { app.showToast("ATENÇÃO: Use o botão Verde de Faturar para Baixar Estoque.", "warning"); return; }
    if (id) await app.db.collection('ordens_servico').doc(id).update(payload); else await app.db.collection('ordens_servico').add(payload);
    
    app.showToast("Prontuário Salvo.", "success"); const mod = document.getElementById('modalOS'); if(mod) bootstrap.Modal.getInstance(mod).hide();
};

// =====================================================================
// 8. FATURAMENTO (BAIXA DE ESTOQUE E RATEIO DE COMISSÕES PARA RH)
// =====================================================================
app.abrirFaturamentoDireto = function(id) {
    app.osParaFaturar = app.bancoOSCompleto.find(o => o.id === id);
    const vTotal = document.getElementById('fat_valor_total');
    if(vTotal && app.osParaFaturar) vTotal.innerText = `R$ ${(app.osParaFaturar.total||0).toFixed(2).replace('.',',')}`;
    const mod = document.getElementById('modalFaturamento'); if(mod) new bootstrap.Modal(mod).show();
};

app.abrirFaturamentoOS = function() {
    app.salvarOS();
    setTimeout(() => { const idElem = document.getElementById('os_id'); if(idElem && idElem.value) app.abrirFaturamentoDireto(idElem.value); }, 1000);
};

app.processarFaturamentoCompleto = async function() {
    if(!app.osParaFaturar) return;
    const fpElem = document.getElementById('fat_metodo'); const fp = fpElem ? fpElem.value : 'Dinheiro';
    const parcElem = document.getElementById('fat_parcelas'); const parcelasText = parcElem ? parcElem.value : '1';
    
    const totalVenda = app.osParaFaturar.total || 0; const batch = app.db.batch();
    let nP = 1; if(fp.includes('Boleto') || fp.includes('Cartao') || fp.includes('Parcelado') || fp.includes('Crediario')) { nP = parseInt(parcelasText) || 1; }
    const vP = totalVenda / nP; const stsPgto = (fp.includes('Boleto') || fp.includes('Crediario')) ? 'pendente' : 'pago';
    const dtBase = new Date().toISOString().split('T')[0];

    for(let i=0; i<nP; i++) { 
        let dV = new Date(dtBase); if(nP>1 || stsPgto==='pendente') dV.setDate(dV.getDate() + (i*30)); 
        batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: 'receita', desc: nP>1 ? `O.S: [${app.osParaFaturar.placa}] - Parc ${i+1}/${nP}` : `O.S: [${app.osParaFaturar.placa}] - Cliente: ${app.osParaFaturar.cliente}`, valor: vP, parcelaAtual: i+1, totalParcelas: nP, metodo: fp, vencimento: dV.toISOString().split('T')[0], status: stsPgto }); 
    }

    if(app.osParaFaturar.pecas && !app.osParaFaturar.baixaEstoqueFeita) {
        for (const p of app.osParaFaturar.pecas) {
            if (p.idEstoque) { const estRef = app.db.collection('estoque').doc(p.idEstoque); const estDoc = await estRef.get(); if(estDoc.exists) batch.update(estRef, { qtd: Math.max(0, estDoc.data().qtd - p.qtd) }); }
        }
    }

    // CALCULO DO RH (RATEIO CHEVRON): Divide as comissões proporcionalmente entre os mecânicos do Box
    let comissoesDetalhadas = [];
    let somaComissaoGlobal = 0;
    
    if (app.osParaFaturar.mecanicoAtribuido) {
        let mecanicosArray = app.osParaFaturar.mecanicoAtribuido.split(' + ');
        mecanicosArray.forEach(nomeMec => {
            let func = app.bancoEquipe.find(f => f.nome === nomeMec);
            if (func) {
                let baseMO = (app.osParaFaturar.maoObraTotal || 0) / mecanicosArray.length;
                let basePc = (app.osParaFaturar.pecasTotal || 0) / mecanicosArray.length;
                let valMO = baseMO * (parseFloat(func.comissao || 0) / 100);
                let valPc = basePc * (parseFloat(func.comissao_pecas || 0) / 100);
                let totalMec = valMO + valPc;
                comissoesDetalhadas.push({ nome: func.nome, valor: totalMec });
                somaComissaoGlobal += totalMec;
            }
        });
    }
    
    let h = app.osParaFaturar.historico || [];
    h.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: `FATURAMENTO CONCLUÍDO: ${nP}x (${fp}). Rateio de comissões ativado.` });
    
    batch.update(app.db.collection('ordens_servico').doc(app.osParaFaturar.id), { 
        status: 'entregue', 
        baixaEstoqueFeita: true, 
        comissaoProcessada: somaComissaoGlobal, 
        comissoesDetalhadas: comissoesDetalhadas, 
        historico: h, 
        ultimaAtualizacao: new Date().toISOString() 
    });
    
    await batch.commit(); 
    app.registrarAuditoriaGlobal("Faturamento O.S.", `Faturou a placa ${app.osParaFaturar.placa}. R$ ${totalVenda.toFixed(2)}`);
    app.showToast("CHECKOUT CONCLUÍDO! Receitas geradas e Comissões do RH registradas.", "success");
    
    const modFat = document.getElementById('modalFaturamento'); if(modFat) bootstrap.Modal.getInstance(modFat).hide();
    const modOS = document.getElementById('modalOS'); if(modOS) bootstrap.Modal.getInstance(modOS).hide();
};

// =====================================================================
// 9. DRE, FLUXO DE CAIXA COM VÍNCULO RH (PRÓ-LABORE/VALE)
// =====================================================================
app.abrirModalFinanceiro = function(mode='nova', tipo='', id='') {
    const frm = document.getElementById('formFinanceiro'); if(frm) frm.reset();
    if(document.getElementById('fin_id')) document.getElementById('fin_id').value = '';
    
    if(mode === 'edit' && !tipo) { const f = app.bancoFin.find(x => x.id === id); if(f) tipo = f.tipo; }
    
    if(document.getElementById('fin_tipo')) document.getElementById('fin_tipo').value = tipo;
    const finTitulo = document.getElementById('fin_titulo'); if(finTitulo) finTitulo.innerHTML = tipo === 'receita' ? '<i class="bi bi-plus-circle text-success me-2"></i> Receita Avulsa' : '<i class="bi bi-dash-circle text-danger me-2"></i> Lançar Despesa / NF';
    if(document.getElementById('fin_data')) document.getElementById('fin_data').value = new Date().toISOString().split('T')[0];
    
    const divStatus = document.getElementById('divStatusEdit'); const divParcelas = document.getElementById('divParcelas');
    
    if(mode === 'edit') {
        const f = app.bancoFin.find(x => x.id === id);
        if(f) {
            if(document.getElementById('fin_id')) document.getElementById('fin_id').value = f.id;
            if(document.getElementById('fin_desc')) document.getElementById('fin_desc').value = f.desc || '';
            if(document.getElementById('fin_valor')) document.getElementById('fin_valor').value = f.valor || 0;
            if(document.getElementById('fin_data')) document.getElementById('fin_data').value = f.vencimento ? f.vencimento.split('T')[0] : '';
            if(document.getElementById('fin_metodo')) document.getElementById('fin_metodo').value = f.metodo || 'Dinheiro';
            if(divStatus) { divStatus.style.display = 'block'; if(document.getElementById('fin_status')) document.getElementById('fin_status').value = f.status || 'pendente'; }
            if(divParcelas) divParcelas.style.display = 'none';
        }
    } else {
        if(divStatus) divStatus.style.display = 'none';
        if(divParcelas) divParcelas.style.display = 'block';
        if(tipo === 'receita' && document.getElementById('fin_parcelas')) document.getElementById('fin_parcelas').value = '1';
    }
    
    const mod = document.getElementById('modalFin'); if(mod) new bootstrap.Modal(mod).show();
};

app.verificarPgtoFinManual = function() {
    const f = document.getElementById('fin_metodo').value; const d = document.getElementById('divParcelas');
    if(d) { if(f.includes('Parcelado') || f.includes('Boleto')) d.style.display = 'block'; else { d.style.display = 'none'; document.getElementById('fin_parcelas').value = '1'; } }
};

app.salvarLancamentoFinanceiro = async function(e) {
    e.preventDefault();
    const idField = document.getElementById('fin_id'); const id = idField ? idField.value : '';
    const tipo = document.getElementById('fin_tipo') ? document.getElementById('fin_tipo').value : ''; 
    const desc = document.getElementById('fin_desc') ? document.getElementById('fin_desc').value : '';
    const valorTotal = document.getElementById('fin_valor') ? parseFloat(document.getElementById('fin_valor').value) : 0; 
    const dataInicial = document.getElementById('fin_data') ? new Date(document.getElementById('fin_data').value) : new Date();
    const fp = document.getElementById('fin_metodo') ? document.getElementById('fin_metodo').value : ''; 
    
    const vinculoField = document.getElementById('fin_vinculo_rh');
    const vinculoData = (vinculoField && vinculoField.value) ? vinculoField.value.split('|') : null;

    if(id) {
        const m = prompt("ATENÇÃO: Modificando DRE. Digite a JUSTIFICATIVA (Auditoria Obrigatória):");
        if(!m || m.trim() === '') { app.showToast("Operação Abortada. A justificativa de caixa é obrigatória.", "error"); return; }

        const sts = document.getElementById('fin_status') ? document.getElementById('fin_status').value : 'pendente';
        await app.db.collection('financeiro').doc(id).update({ desc: desc, valor: valorTotal, vencimento: dataInicial.toISOString().split('T')[0], metodo: fp, status: sts });
        app.showToast(`Documento Atualizado. Status: ${sts.toUpperCase()}`, "success");
        app.registrarAuditoriaGlobal("Financeiro (DRE)", `Editou o título [${desc}]. Status: ${sts.toUpperCase()}. Justificativa: ${m}`);
    } else {
        const parcelasText = document.getElementById('fin_parcelas') ? document.getElementById('fin_parcelas').value : '1';
        const batch = app.db.batch();
        let nP = 1; if(fp.includes('Boleto') || fp.includes('Cartão') || fp.includes('Parcelado')) nP = parseInt(parcelasText) || 1;
        
        const vP = valorTotal / nP; 
        const stsPgto = (fp.includes('Boleto') || fp.includes('Pendente') || fp.includes('Crédito') || fp.includes('Parcelado')) ? 'pendente' : 'pago';

        for(let i=0; i<nP; i++) {
            let v = new Date(dataInicial); if(nP>1 || stsPgto==='pendente') v.setMonth(v.getMonth() + i);
            let fDoc = { tenantId: app.t_id, tipo: tipo, desc: nP>1 ? `${desc} - Parc ${i+1}/${nP}`: desc, valor: vP, parcelaAtual: i+1, totalParcelas: nP, metodo: fp, vencimento: v.toISOString().split('T')[0], status: stsPgto };
            if (vinculoData) { fDoc.vinculoRhId = vinculoData[0]; fDoc.vinculoRhNome = vinculoData[1]; }
            batch.set(app.db.collection('financeiro').doc(), fDoc);
        }
        
        if (tipo === 'despesa' && vinculoData) {
            batch.set(app.db.collection('vales_rh').doc(), { tenantId: app.t_id, idFuncionario: vinculoData[0], nomeFuncionario: vinculoData[1], valor: valorTotal, motivo: desc, dataRealizacao: new Date().toISOString(), responsavel: app.user_nome });
        }
        
        await batch.commit(); 
        app.showToast(`Lançamento processado no DRE.`, "success");
        app.registrarAuditoriaGlobal("Financeiro (DRE)", `Inseriu novo lançamento: ${desc} no valor de R$ ${valorTotal.toFixed(2)}`);
    }
    
    const mod = document.getElementById('modalFin'); if(mod) bootstrap.Modal.getInstance(mod).hide(); e.target.reset();
};

app.iniciarEscutaFinanceiro = function() {
    app.db.collection('financeiro').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoFin = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.filtrarFinanceiro(true);
    });
};

app.filtrarFinanceiro = function(silent = false) {
    const dtIn = document.getElementById('filtroFinInicio') ? document.getElementById('filtroFinInicio').value : '';
    const dtFim = document.getElementById('filtroFinFim') ? document.getElementById('filtroFinFim').value : '';
    
    app.filtroFinDataInicio = dtIn; app.filtroFinDataFim = dtFim;
    
    let base = [...app.bancoFin];
    if(dtIn && dtFim) {
        const d1 = new Date(dtIn); const d2 = new Date(dtFim);
        base = base.filter(f => { const dV = new Date(f.vencimento); return dV >= d1 && dV <= d2; });
    }
    app.bancoFinFiltrado = base;
    app.renderizarFinanceiroGeral();
    if(!silent) app.showToast("Filtros Temporais aplicados no Fluxo de Caixa.", "success");
};

app.renderizarFinanceiroGeral = function() {
    if(!document.getElementById('tela_financeiro')) return;
    
    let totRec = 0, totPag = 0;
    const tPagar = document.getElementById('tabelaPagarCorpo'); const tReceber = document.getElementById('tabelaReceberCorpo');
    let hPagar = '', hReceber = '';
    
    app.bancoFinFiltrado.sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(f => {
        const isR = f.tipo === 'receita';
        if(isR && f.status === 'pago') totRec += f.valor; 
        if(!isR && f.status === 'pago') totPag += f.valor;
        
        const cor = isR ? 'text-success' : 'text-danger';
        const st = f.status === 'pago' ? '<span class="badge bg-success px-2 py-1"><i class="bi bi-check2-all"></i> Quitado</span>' : '<span class="badge bg-warning text-dark px-2 py-1"><i class="bi bi-hourglass-split"></i> A Vencer / Pendente</span>';
        const rhBadge = f.vinculoRhNome ? `<br><span class="badge bg-warning text-dark mt-1"><i class="bi bi-person-badge"></i> ${f.vinculoRhNome}</span>` : '';
        const btnEdit = `<button class="btn btn-sm btn-outline-info shadow-sm me-1" onclick="app.abrirModalFinanceiro('edit', '${f.tipo}', '${f.id}')"><i class="bi bi-pencil"></i> Editar</button>`;
        
        const html = `<tr><td class="text-white-50 fw-bold"><i class="bi bi-calendar-event me-2"></i> ${f.vencimento ? new Date(f.vencimento).toLocaleDateString('pt-BR') : ''}</td><td class="text-white fw-bold">${f.desc}${rhBadge}</td><td><span class="badge bg-dark border border-secondary px-3 py-1 text-white-50">${f.parcelaAtual}/${f.totalParcelas}</span></td><td class="text-white-50 small">${f.metodo || 'Dinheiro'}</td><td class="${cor} fw-bold fs-6">R$ ${f.valor.toFixed(2).replace('.',',')}</td><td>${st}</td><td class="gestao-only text-end">${btnEdit} <button class="btn btn-sm btn-link text-danger admin-only" onclick="app.db.collection('financeiro').doc('${f.id}').delete()"><i class="bi bi-trash"></i></button></td></tr>`;
        if(isR) hReceber += html; else hPagar += html;
    });

    if(tPagar) tPagar.innerHTML = hPagar || '<tr><td colspan="7" class="text-center text-white-50 py-5"><i class="bi bi-check-circle text-success fs-3 d-block mb-2"></i> Caixa Respirando. Nenhuma dívida pendente.</td></tr>';
    if(tReceber) tReceber.innerHTML = hReceber || '<tr><td colspan="7" class="text-center text-white-50 py-5">Não há previsões neste filtro.</td></tr>';

    let totCom = 0;
    app.bancoOSCompleto.filter(o=>o.status==='entregue').forEach(o => {
        if(app.filtroFinDataInicio && app.filtroFinDataFim) {
            const dV = new Date(o.ultimaAtualizacao); const d1 = new Date(app.filtroFinDataInicio); const d2 = new Date(app.filtroFinDataFim);
            if(dV >= d1 && dV <= d2) totCom += (o.comissaoProcessada||0);
        } else { totCom += (o.comissaoProcessada||0); }
    });
    
    if(document.getElementById('dreReceitas')) document.getElementById('dreReceitas').innerText = `R$ ${totRec.toFixed(2).replace('.',',')}`;
    if(document.getElementById('dreDespesas')) document.getElementById('dreDespesas').innerText = `R$ ${totPag.toFixed(2).replace('.',',')}`;
    if(document.getElementById('dreComissoes')) document.getElementById('dreComissoes').innerText = `R$ ${totCom.toFixed(2).replace('.',',')}`;
    if(document.getElementById('dreLucro')) document.getElementById('dreLucro').innerText = `R$ ${(totRec - totPag - totCom).toFixed(2).replace('.',',')}`;
};

app.exportarRelatorioFinanceiro = function() {
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); let y = 15;
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(app.t_nome.toUpperCase(), 105, y, { align: "center" }); y += 10;
        doc.setFontSize(12); doc.text(`RELATÓRIO GERENCIAL - FLUXO DE CAIXA E TÍTULOS`, 105, y, { align: "center" }); y += 10;
        
        let pIn = app.filtroFinDataInicio ? new Date(app.filtroFinDataInicio).toLocaleDateString('pt-BR') : 'Início Geral';
        let pFim = app.filtroFinDataFim ? new Date(app.filtroFinDataFim).toLocaleDateString('pt-BR') : 'Atual';
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`Período Auditado: ${pIn} até ${pFim}`, 15, y); y += 15;

        doc.setFont("helvetica", "bold"); doc.text("1. RECEBIMENTOS (Contas a Receber Faturadas)", 15, y); y += 5;
        let bR = []; app.bancoFinFiltrado.filter(x=>x.tipo==='receita').forEach(x => { bR.push([x.vencimento.split('-').reverse().join('/'), x.desc, x.metodo, `R$ ${x.valor.toFixed(2)}`, x.status.toUpperCase()]); });
        if(bR.length > 0) { doc.autoTable({ startY: y, head: [['Data Base', 'Cliente/Referência', 'Modalidade', 'Vlr.', 'Status']], body: bR, theme: 'grid' }); y = doc.lastAutoTable.finalY + 15; } else { doc.text("- Nenhuma entrada no período.", 15, y+5); y += 15; }

        doc.setFont("helvetica", "bold"); doc.text("2. DESPESAS (Contas a Pagar / Fornecedores)", 15, y); y += 5;
        let bP = []; app.bancoFinFiltrado.filter(x=>x.tipo==='despesa').forEach(x => { bP.push([x.vencimento.split('-').reverse().join('/'), x.desc, x.metodo, `R$ ${x.valor.toFixed(2)}`, x.status.toUpperCase()]); });
        if(bP.length > 0) { doc.autoTable({ startY: y, head: [['Data Base', 'Fornecedor/Motivo', 'Modalidade', 'Vlr.', 'Status']], body: bP, theme: 'grid' }); y = doc.lastAutoTable.finalY + 15; } else { doc.text("- Nenhuma despesa no período.", 15, y+5); y += 15; }

        doc.save(`Extrato_${app.t_nome.replace(' ', '_')}.pdf`);
        app.showToast("Relatório PDF emitido.", "success");
    } catch(e) { console.error(e); app.showToast("Erro na geração do PDF.", "error"); }
};

// =====================================================================
// 10. GESTÃO DE RH / VALES E EQUIPE (PAINEL GESTOR)
// =====================================================================
app.iniciarEscutaEquipe = function() {
    app.db.collection('funcionarios').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoEquipe = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.popularSelectVinculoRH();
        app.renderizarEquipeRH();
    });
};

app.renderizarEquipeRH = function() {
    const tbody = document.getElementById('tabelaEquipe'); if(!tbody) return;
    if(app.bancoEquipe.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-white-50 py-5 fs-5">Sem equipe cadastrada na nuvem.</td></tr>'; return; }
    
    tbody.innerHTML = app.bancoEquipe.map(f => {
        const nAcesso = f.role === 'gerente' ? '<span class="badge bg-warning text-dark">Gerente/Vendedor</span>' : '<span class="badge bg-secondary text-white">Mecânico / Box</span>';
        
        let totalCom = 0;
        app.bancoOSCompleto.filter(o => o.status === 'entregue' && o.comissoesDetalhadas).forEach(o => {
            let p = o.comissoesDetalhadas.find(c => c.nome === f.nome);
            if(p) totalCom += p.valor;
        });
        
        let totalVales = 0;
        app.bancoVales.filter(v => v.idFuncionario === f.id).forEach(v => totalVales += v.valor);
        
        let saldoReal = totalCom - totalVales;
        
        return `<tr><td class="fw-bold text-white fs-6"><i class="bi bi-person-circle text-success me-2"></i> ${f.nome}</td><td>${nAcesso}</td><td class="text-warning fw-bold">${f.comissao||0}% / ${f.comissao_pecas||0}%</td><td class="text-info fw-bold fs-5">R$ ${saldoReal.toFixed(2).replace('.',',')}</td><td><span class="bg-dark border border-secondary px-3 py-1 rounded text-info">${f.usuario}</span> <small class="text-white-50 ms-2">[${f.senha}]</small></td><td class="admin-only text-end"><button class="btn btn-sm btn-outline-warning shadow-sm px-3 me-2" onclick="app.abrirModalValeRH('${f.id}', '${f.nome}')"><i class="bi bi-cash-stack"></i> Lançar Vale</button><button class="btn btn-sm btn-outline-danger shadow-sm px-3" onclick="app.apagarFuncionario('${f.id}')"><i class="bi bi-slash-circle"></i></button></td></tr>`;
    }).join('');
};

app.abrirModalEquipe = function() {
    const frm = document.getElementById('formEquipe'); if(frm) frm.reset();
    const mod = document.getElementById('modalEquipe'); if(mod) new bootstrap.Modal(mod).show();
};

app.salvarFuncionario = async function(e) {
    e.preventDefault();
    await app.db.collection('funcionarios').add({ 
        tenantId: app.t_id, nome: document.getElementById('f_nome').value, role: document.getElementById('f_cargo').value, 
        comissao: parseFloat(document.getElementById('f_comissao_mo').value), comissao_pecas: parseFloat(document.getElementById('f_comissao_pecas').value),
        usuario: document.getElementById('f_user').value, senha: document.getElementById('f_pass').value 
    });
    app.showToast("Acesso corporativo Seguro criado.", "success"); 
    app.registrarAuditoriaGlobal("Gestão RH", `Criou credencial para: ${document.getElementById('f_nome').value}`);
    e.target.reset(); const mod = document.getElementById('modalEquipe'); if(mod) bootstrap.Modal.getInstance(mod).hide();
};

app.apagarFuncionario = async function(id) { 
    if(confirm("Deseja bloquear permanentemente o acesso deste usuário?")) { 
        await app.db.collection('funcionarios').doc(id).delete(); 
        app.showToast("Acesso invalidado.", "success"); 
        app.registrarAuditoriaGlobal("Gestão RH", `Deletou o acesso de um funcionário.`);
    } 
};

app.abrirModalValeRH = function(idFunc, nomeFunc) {
    document.getElementById('vale_id_func').value = idFunc;
    document.getElementById('vale_nome_func').value = nomeFunc;
    document.getElementById('lblNomeValeFunc').innerText = nomeFunc;
    document.getElementById('formValeRH').reset();
    new bootstrap.Modal(document.getElementById('modalValeRH')).show();
};

app.confirmarValeRH = async function(e) {
    e.preventDefault();
    const idFunc = document.getElementById('vale_id_func').value;
    const nomeFunc = document.getElementById('vale_nome_func').value;
    const valor = parseFloat(document.getElementById('vale_valor').value);
    const motivo = document.getElementById('vale_motivo').value;
    
    if (valor <= 0) { app.showToast("Valor inválido.", "error"); return; }
    
    const batch = app.db.batch();
    const dataH = new Date().toISOString();
    
    batch.set(app.db.collection('vales_rh').doc(), { tenantId: app.t_id, idFuncionario: idFunc, nomeFuncionario: nomeFunc, valor: valor, motivo: motivo, dataRealizacao: dataH, responsavel: app.user_nome });
    batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: 'despesa', desc: `[VALE/RH] ${nomeFunc} - ${motivo}`, valor: valor, parcelaAtual: 1, totalParcelas: 1, metodo: 'Dinheiro', vencimento: dataH.split('T')[0], status: 'pago', vinculoRhId: idFunc, vinculoRhNome: nomeFunc });
    
    await batch.commit();
    app.registrarAuditoriaGlobal("RH & Financeiro", `Lançou vale de R$ ${valor.toFixed(2)} para ${nomeFunc}.`);
    app.showToast("Vale deduzido com sucesso e lançado no DRE.", "success");
    bootstrap.Modal.getInstance(document.getElementById('modalValeRH')).hide();
};

app.renderizarTabelaArquivo = function() {
    let entregues = app.bancoOSCompleto.filter(os => os.status === 'entregue').sort((a,b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));
    const busca = document.getElementById('buscaGeral'); const t = busca ? busca.value.toLowerCase().trim() : '';
    if (t) entregues = entregues.filter(o => (o.placa&&o.placa.toLowerCase().includes(t)) || (o.cliente&&o.cliente.toLowerCase().includes(t)));
    
    const tbody = document.getElementById('tabelaArquivoCorpo');
    if(tbody) tbody.innerHTML = entregues.map(os => `<tr><td class="text-white-50 small"><i class="bi bi-calendar-check text-success me-2"></i> ${new Date(os.ultimaAtualizacao).toLocaleDateString('pt-BR')}</td><td><span class="badge bg-dark border px-3 py-2 fs-6 shadow-sm">${os.placa}</span></td><td class="text-white fw-bold">${os.veiculo}</td><td class="text-white-50">${os.cliente}</td><td class="gestao-only text-success fw-bold">R$ ${(os.total||0).toFixed(2).replace('.',',')}</td><td class="text-center"><button class="btn btn-outline-info shadow-sm fw-bold px-4" onclick="app.abrirModalOS('edit', '${os.id}')"><i class="bi bi-folder-symlink-fill me-2"></i> Prontuário</button></td></tr>`).join('');
};

app.iniciarEscutaLixeira = function() {
    app.db.collection('lixeira_auditoria').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoAuditoria = snap.docs.map(d => d.data());
        app.bancoAuditoria.sort((a,b) => new Date(b.apagadoEm) - new Date(a.apagadoEm));
        const tb = document.getElementById('tabelaLixeiraCorpo');
        if(tb) {
            tb.innerHTML = app.bancoAuditoria.map(l => `<tr><td class="text-white-50 small">${new Date(l.apagadoEm).toLocaleString('pt-BR')}</td><td class="text-white fw-bold">${l.placaOriginal}</td><td><i class="bi bi-person-badge text-danger"></i> ${l.apagadoPor}</td><td class="text-warning">${l.motivo}</td></tr>`).join('');
        }
        
        const lixeiraHeader = document.querySelector('#tela_arquivo .text-danger.fw-bold');
        if(lixeiraHeader && !document.getElementById('btnExportarAuditoria')) {
            lixeiraHeader.innerHTML += ` <button id="btnExportarAuditoria" class="btn btn-sm btn-outline-danger shadow-sm ms-3" onclick="app.exportarAuditoriaPDF()"><i class="bi bi-file-pdf"></i> Exportar Auditoria</button>`;
        }
    });
};

app.exportarAuditoriaPDF = function() {
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); let y = 15;
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text(app.t_nome.toUpperCase(), 105, y, { align: "center" }); y += 10;
        doc.setFontSize(12); doc.text(`RELATÓRIO DE AUDITORIA E RASTREIO`, 105, y, { align: "center" }); y += 15;
        
        let bodyTable = [];
        app.bancoAuditoria.forEach(l => { bodyTable.push([new Date(l.apagadoEm).toLocaleString('pt-BR'), l.placaOriginal, l.apagadoPor, l.motivo]); });
        
        if(bodyTable.length > 0) { doc.autoTable({ startY: y, head: [['Data/Hora', 'Módulo/Placa', 'Usuário', 'Ação / Justificativa']], body: bodyTable, theme: 'grid' }); } 
        else { doc.text("- Lixeira de auditoria vazia.", 15, y); }

        doc.save(`Auditoria_${app.t_nome.replace(' ', '_')}.pdf`);
        app.showToast("Log de Auditoria exportado em PDF.", "success");
    } catch(e) { console.error(e); app.showToast("Erro na geração do PDF de Auditoria.", "error"); }
};

app.apagarOS = async function() {
    if(app.t_role !== 'admin') { app.showToast("Cancelamento Bloqueado. Exige perfil de Dono.", "error"); return; }
    
    const m = prompt("ATENÇÃO: A Ficha Técnica será extirpada. \nDigite a JUSTIFICATIVA REAL:");
    if(!m || m.trim() === '') { app.showToast("Operação Abortada.", "error"); return; }
    
    const idField = document.getElementById('os_id'); const id = idField ? idField.value : '';
    if(!id) return;

    const osCancelada = app.bancoOSCompleto.find(x => x.id === id);
    if(osCancelada) {
        await app.registrarAuditoriaGlobal(`O.S Cancelada: ${osCancelada.placa}`, `Motivo: ${m}`);
        await app.db.collection('ordens_servico').doc(id).delete();
        app.showToast("O.S. Removida e gravada na Trilha Oculta (Lixeira).", "success");
    }
    const mod = document.getElementById('modalOS'); if(mod) bootstrap.Modal.getInstance(mod).hide();
};

// =====================================================================
// 11. CLOUDINARY E EXPORTAÇÃO LAUDO PDF (COM EVIDÊNCIAS DE AUDITORIA)
// =====================================================================
app.configurarCloudinary = function() {
    if (!app.CLOUDINARY_CLOUD_NAME || !app.CLOUDINARY_UPLOAD_PRESET) return;
    try {
        var w = cloudinary.createUploadWidget({ cloudName: app.CLOUDINARY_CLOUD_NAME, uploadPreset: app.CLOUDINARY_UPLOAD_PRESET, sources: ['local', 'camera'], language: 'pt' }, (err, res) => {
            if (!err && res && res.event === "success") { app.fotosOSAtual.push(res.info.secure_url); app.historicoOSAtual.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: "Realizou injeção de Imagem / Evidência no Cloud." }); app.renderizarGaleria(); }
        });
        const btn = document.getElementById("btnUploadCloudinary"); if(btn) btn.addEventListener("click", () => w.open(), false);
    } catch(e) { console.error("Cloudinary Engine Failed: ", e); }
};

app.renderizarGaleria = function() {
    const gal = document.getElementById('galeriaFotosOS');
    if(gal) gal.innerHTML = app.fotosOSAtual.map((url, i) => `<div class="position-relative shadow-sm" style="width: 140px; height: 140px;"><img src="${url}" crossorigin="anonymous" class="img-thumbnail bg-dark border-secondary w-100 h-100 object-fit-cover rounded-3"><button type="button" data-html2canvas-ignore class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 p-0 px-2 rounded-circle" onclick="app.removerFoto(${i})"><i class="bi bi-x"></i></button></div>`).join('');
};

app.removerFoto = function(index) { app.fotosOSAtual.splice(index, 1); app.historicoOSAtual.push({ data: new Date().toISOString(), usuario: app.user_nome, acao: "Excluiu Prova Fotográfica da Base." }); app.renderizarGaleria(); };

app.renderizarHistorico = function() { 
    const hist = document.getElementById('listaHistorico');
    if(hist) {
        hist.innerHTML = app.historicoOSAtual.length === 0 ? '<p class="text-white-50 px-3">O prontuário deste veículo ainda está imaculado (Zero Edições).</p>' : [...app.historicoOSAtual].sort((a,b) => new Date(b.data) - new Date(a.data)).map(h => `
        <li class="timeline-item">
            <div class="timeline-item-header"><strong class="text-white">${h.usuario}</strong><span class="text-info small fw-bold">${new Date(h.data).toLocaleString('pt-BR')}</span></div>
            <div class="timeline-item-body text-warning shadow-sm">${h.acao}</div>
        </li>`).join(''); 
    }
};

async function carregarImagemBase64(url) {
    const res = await fetch(url); const blob = await res.blob();
    return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(blob); });
}

app.exportarPDFMenechelli = async function() {
    const btn = document.getElementById('btnGerarPDF'); if(!btn) return;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Renderizando Laudo...'; btn.disabled = true; 
    const placaElem = document.getElementById('os_placa'); const placa = placaElem ? placaElem.value : 'S-PLACA';
    
    try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth(); let y = 15;
        
        doc.setFillColor(30, 41, 59); doc.rect(0, 0, pageWidth, 40, 'F'); doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text(app.t_nome.toUpperCase(), pageWidth/2, 22, { align: "center" });
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(`LAUDO DE INTEGRIDADE, SERVIÇO E ORÇAMENTO`, pageWidth/2, 30, { align: "center" }); 
        y = 50; doc.setTextColor(0, 0, 0);

        doc.setDrawColor(200, 200, 200); doc.rect(15, y, pageWidth-30, 25);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`Proprietário:`, 20, y+8); doc.setFont("helvetica", "normal"); doc.text(document.getElementById('os_cliente') ? document.getElementById('os_cliente').value : '', 50, y+8);
        doc.setFont("helvetica", "bold"); doc.text(`Contato:`, 130, y+8); doc.setFont("helvetica", "normal"); doc.text(document.getElementById('os_celular') ? document.getElementById('os_celular').value : '', 150, y+8);
        doc.setFont("helvetica", "bold"); doc.text(`Identificação (Placa):`, 20, y+18); doc.setFont("helvetica", "normal"); doc.text(placa, 60, y+18);
        doc.setFont("helvetica", "bold"); doc.text(`Veículo:`, 130, y+18); doc.setFont("helvetica", "normal"); doc.text(document.getElementById('os_veiculo') ? document.getElementById('os_veiculo').value : '', 148, y+18); y += 35;
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`QUEIXA NA RECEPÇÃO (CLIENTE)`, 15, y); doc.line(15, y+2, pageWidth-15, y+2); y += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); 
        const relatoVal = document.getElementById('os_relato_cliente') ? document.getElementById('os_relato_cliente').value : 'Não reportada.';
        const txtQ = doc.splitTextToSize(relatoVal, pageWidth - 30); doc.text(txtQ, 15, y); y += (txtQ.length * 6) + 10;
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`DIAGNÓSTICO PROFISSIONAL (OFICINA)`, 15, y); doc.line(15, y+2, pageWidth-15, y+2); y += 10;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); 
        const diagVal = document.getElementById('os_diagnostico') ? document.getElementById('os_diagnostico').value : 'Inspeção padrão de revisão técnica.';
        const txtL = doc.splitTextToSize(diagVal, pageWidth - 30); doc.text(txtL, 15, y); y += (txtL.length * 6) + 10;

        let tableBody = [];
        document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => { 
            const d = tr.querySelector('.peca-desc') ? tr.querySelector('.peca-desc').value : '';
            const q = tr.querySelector('.peca-qtd') ? tr.querySelector('.peca-qtd').value : '0';
            const vu = tr.querySelector('.peca-venda') ? tr.querySelector('.peca-venda').value : '0';
            const vt = tr.querySelector('.peca-total') ? tr.querySelector('.peca-total').value : '0';
            tableBody.push([d, q, `R$ ${vu}`, `R$ ${vt}`]); 
        });
        doc.autoTable({ startY: y, head: [['Serviço ou Peça Genuína Acoplada', 'Qtd', 'Vlr. Unitário', 'Subtotal da Linha']], body: tableBody, theme: 'grid', headStyles: { fillColor: [30, 41, 59] }, margin: { left: 15, right: 15 }}); y = doc.lastAutoTable.finalY + 15;

        if (app.fotosOSAtual.length > 0) {
            if (y > 220) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`EVIDÊNCIAS FOTOGRÁFICAS DA MANUTENÇÃO`, 15, y); doc.line(15, y+2, pageWidth-15, y+2); y += 10;
            
            let imgX = 15; let imgY = y; const imgSize = 45; const margin = 8;
            for (let i = 0; i < app.fotosOSAtual.length; i++) {
                try {
                    const b64 = await carregarImagemBase64(app.fotosOSAtual[i]);
                    if (imgX + imgSize > pageWidth - 15) { imgX = 15; imgY += imgSize + margin; }
                    if (imgY + imgSize > 280) { doc.addPage(); imgY = 20; imgX = 15; }
                    doc.addImage(b64, 'JPEG', imgX, imgY, imgSize, imgSize);
                    imgX += imgSize + margin;
                } catch (e) { console.error("Erro na imagem Base64 do PDF", e); }
            }
            y = imgY + imgSize + 15;
        }

        if (app.historicoOSAtual.length > 0) {
            if (y > 220) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`TRILHA DE AUDITORIA E RESPONSABILIDADE (TIMELINE)`, 15, y); doc.line(15, y+2, pageWidth-15, y+2); y += 10;
            doc.setFont("helvetica", "normal"); doc.setFontSize(9);
            app.historicoOSAtual.slice().sort((a,b) => new Date(a.data) - new Date(b.data)).forEach(h => {
                const dataF = new Date(h.data).toLocaleString('pt-BR');
                const txtH = doc.splitTextToSize(`[${dataF}] ${h.usuario}: ${h.acao}`, pageWidth - 30);
                if (y + (txtH.length * 5) > 280) { doc.addPage(); y = 20; }
                doc.text(txtH, 15, y); y += (txtH.length * 5) + 3;
            });
            y += 10;
        }

        if (y > 250) { doc.addPage(); y = 20; }
        if(app.t_role === 'admin' || app.t_role === 'gerente') {
            doc.setFillColor(240, 240, 240); doc.rect(pageWidth - 85, y, 70, 15, 'F');
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); 
            doc.text(`LIQUIDAÇÃO FINAL:`, pageWidth - 80, y + 10);
            const totalOSElem = document.getElementById('os_total_geral'); const totalOS = totalOSElem ? totalOSElem.innerText : 'R$ 0,00';
            doc.setTextColor(0, 128, 0); doc.text(totalOS, pageWidth - 35, y + 10);
        }

        doc.save(`OS_Auditada_${placa}_${new Date().getTime()}.pdf`);
        app.showToast("Laudo Oficial Auditado (PDF) Gerado e Exportado.", "success");

    } catch (erro) {
        console.error("Erro Crítico PDF Builder:", erro);
        app.showToast("Ocorreu um erro no processador PDF da Nuvem.", "error");
    } finally {
        btn.innerHTML = '<i class="bi bi-file-pdf-fill me-1"></i> Exportar Laudo e Auditoria'; btn.disabled = false;
    }
};

// =====================================================================
// 12. CÉREBRO DA I.A. GEMINI 1.5 FLASH (COM COMPRESSÃO ANTI-OVERFLOW)
// =====================================================================
app.minhaGeminiKey = null;
app.iaTrabalhando = false;

app.iniciarEscutaIA = function() {
    if(app.t_id) {
        app.db.collection('oficinas').doc(app.t_id).onSnapshot(doc => { 
            if(doc.exists) {
                const d = doc.data();
                app.minhaGeminiKey = d.geminiKey || d.gemini || d.apiGemini || d.api_gemini || d.apiKeyGemini || null;
            }
        });
    }

    app.db.collection('conhecimento_ia').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoIA = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarListaIA();
    });
};

app.renderizarListaIA = function() {
    const div = document.getElementById('listaConhecimentosIA'); if(!div) return;
    if(app.bancoIA.length === 0) { div.innerHTML = '<p class="text-white-50 text-center mt-3">A Mente Cognitiva (RAG) está vazia. Importe dados.</p>'; return; }
    div.innerHTML = app.bancoIA.map(ia => `<div class="d-flex justify-content-between align-items-center bg-dark p-3 mb-2 rounded border border-secondary shadow-sm"><span class="text-white-50 text-truncate fw-bold" style="max-width: 85%;">${ia.texto}</span><button class="btn btn-sm btn-outline-danger border-0" onclick="app.apagarConhecimentoIA('${ia.id}')"><i class="bi bi-trash-fill"></i></button></div>`).join('');
};

app.salvarConhecimentoIA = async function(textoAvulso = null) {
    const textarea = document.getElementById('iaConhecimentoTexto'); const valor = textoAvulso || (textarea ? textarea.value.trim() : '');
    if(!valor) { app.showToast("O input de dados não pode ser vazio.", "warning"); return; }
    await app.db.collection('conhecimento_ia').add({ tenantId: app.t_id, texto: valor, dataImportacao: new Date().toISOString() });
    app.showToast("Conhecimento gravado.", "success"); if(textarea && !textoAvulso) textarea.value = '';
};

app.apagarConhecimentoIA = async function(id) {
    if(confirm("Deseja apagar esta memória?")) {
        await app.db.collection('conhecimento_ia').doc(id).delete(); app.showToast("Memória apagada.", "success");
    }
};

app.processarArquivoParaIA = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const statusLabel = document.getElementById('iaFileStatus');
    if(statusLabel) { statusLabel.className = "text-warning fw-bold d-block text-center"; statusLabel.innerText = "Lendo matriz física do arquivo e traduzindo para RAG..."; }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result; const txtLimpo = text.substring(0, 10000);
        await app.salvarConhecimentoIA(`[ARQUIVO IMPORTADO: ${file.name}]\n\n${txtLimpo}`);
        if(statusLabel) { statusLabel.className = "text-success fw-bold d-block text-center"; statusLabel.innerText = "Aquisição concluída!"; setTimeout(() => { statusLabel.innerText = ""; }, 5000); }
    };
    reader.readAsText(file); 
};

// 🔥 FUNÇÃO PARA GARANTIR A CHAVE
app.obterGeminiKey = function() {
    let key = app.minhaGeminiKey;

    if (!key || key === 'null' || key === 'undefined') {
        key = sessionStorage.getItem('t_gemini');
    }

    if (!key || key === 'null' || key === 'undefined') {
        return null;
    }

    return key.trim();
};

// 🔥 MOTOR GEMINI CORRIGIDO
app.chamarGemini = async function(promptCompleto) {
    const key = app.obterGeminiKey();

    if (!key) {
        console.error("❌ Gemini Key NÃO encontrada");
        app.showToast("A chave da IA não foi encontrada no banco.", "error");
        return "Erro: API Key do Gemini não configurada.";
    }

    try {
        console.log("🧠 Enviando para Gemini...");

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptCompleto }]
                }]
            })
        });

        const data = await res.json();

        console.log("📡 Resposta Gemini:", data);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${data.error?.message || 'Erro desconhecido'}`);
        }

        if (!data.candidates || !data.candidates[0]) {
            throw new Error("Resposta da IA inválida.");
        }

        const resposta = data.candidates[0]?.content?.parts?.[0]?.text;

        if (!resposta) {
            throw new Error("IA não retornou texto.");
        }

        return resposta;

    } catch (e) {
        console.error("🔥 ERRO GEMINI:", e);
        return `Erro na IA: ${e.message}`;
    }
};

// 🔥 PERGUNTA JARVIS CORRIGIDA
app.perguntarJarvis = async function() {
    if (app.iaTrabalhando) return;

    const inp = document.getElementById('jarvisInput');
    const resDiv = document.getElementById('jarvisResposta');

    if (!inp || !inp.value) return;

    app.iaTrabalhando = true;

    resDiv.classList.remove('d-none');
    resDiv.innerHTML = '<span class="spinner-border text-info spinner-border-sm me-2"></span> Processando...';

    try {
        const manuaisPuros = app.bancoIA
            .map(ia => ia.texto)
            .join('\n')
            .substring(0, 5000);

        const promptUnificado =
            `Você é o Consultor Técnico thIAguinho da oficina "${app.t_nome}".\n\n` +
            `MANUAIS:\n${manuaisPuros}\n\n` +
            `Se não souber, diga que não sabe.\n\n` +
            `PERGUNTA: "${inp.value}"`;

        const resposta = await app.chamarGemini(promptUnificado);

        resDiv.innerHTML = resposta.replace(/\n/g, '<br>');

    } catch (e) {
        console.error(e);
        resDiv.innerHTML = "Erro ao processar pergunta.";
    }

    inp.value = '';
    app.iaTrabalhando = false;
};
