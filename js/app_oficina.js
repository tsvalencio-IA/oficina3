window.app = {};

// =====================================================================
// 1. CONFIGURAÇÃO E SESSÃO
// =====================================================================
app.firebaseConfig = {
    apiKey: "AIzaSyBqIuCsHHuy_f-mBWV4JBkbyOorXpqQvqg",
    authDomain: "hub-thiaguinho.firebaseapp.com",
    projectId: "hub-thiaguinho",
    storageBucket: "hub-thiaguinho.firebasestorage.app",
    messagingSenderId: "453508098543",
    appId: "1:453508098543:web:305f4d48edd9be40bd6e1a"
};

if (!firebase.apps.length) firebase.initializeApp(app.firebaseConfig);
app.db = firebase.firestore();

app.CLOUDINARY_CLOUD_NAME = sessionStorage.getItem('t_cloudName') || 'dmuvm1o6m';
app.CLOUDINARY_UPLOAD_PRESET = sessionStorage.getItem('t_cloudPreset') || 'evolution';
app.API_KEY_GEMINI = sessionStorage.getItem('t_gemini');
app.t_id = sessionStorage.getItem('t_id');
app.t_nome = sessionStorage.getItem('t_nome');
app.t_role = sessionStorage.getItem('t_role') || 'admin';
app.user_nome = sessionStorage.getItem('f_nome') || 'Admin';
app.user_comissao = parseFloat(sessionStorage.getItem('f_comissao') || 0);

// Segurança: Se não tem sessão, manda pro login
if (!app.t_id && !sessionStorage.getItem('thiaguinho_master')) window.location.replace('index.html');

app.bancoOS = [];
app.bancoEstoque = [];
app.bancoFin = [];
app.bancoCrm = [];
app.bancoIA = [];
app.bancoMensagens = [];
app.fotosOSAtual = [];
app.historicoOSAtual = [];
app.osParaFaturar = null;
app.chatActiveClienteId = null;

// =====================================================================
// 2. INICIALIZAÇÃO
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('lblEmpresa')) document.getElementById('lblEmpresa').innerText = app.t_nome;
    if(document.getElementById('lblUsuario')) document.getElementById('lblUsuario').innerText = app.user_nome;

    // RBAC
    const style = document.createElement('style');
    if (app.t_role === 'equipe') {        style.innerHTML = '.admin-only, .gestao-only { display: none !important; } .nav-link i { width: 20px; }';
    } else if (app.t_role === 'gerente') {
        style.innerHTML = '.admin-only { display: none !important; } .gestao-only { display: block !important; }';
    } else {
        style.innerHTML = '.mecanico-only { display: none !important; }';
    }
    document.head.appendChild(style);

    app.construirMenuLateral();
    
    // Inicia as Escutas
    app.iniciarEscutaOS();
    app.iniciarEscutaCrm();
    app.iniciarEscutaMensagens();
    
    if(app.t_role === 'admin' || app.t_role === 'gerente') {
        app.iniciarEscutaEstoque();
        app.iniciarEscutaFinanceiro();
    }
    if(app.t_role === 'admin') {
        app.iniciarEscutaEquipe();
        app.iniciarEscutaIA();
    }
    app.configurarCloudinary();
    app.mostrarTela('tela_os', 'Pátio Ativo');
});

app.showToast = function(msg, type='success') {
    const bg = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warning text-dark';
    const t = document.createElement('div');
    t.innerHTML = `<div class="toast align-items-center text-white ${bg} border-0 show p-3 mb-2 shadow rounded"><div class="d-flex"><div class="toast-body fw-bold">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>`;
    document.getElementById('toastContainer').appendChild(t.querySelector('.toast'));
    setTimeout(() => t.querySelector('.toast')?.remove(), 5000);
};

app.sair = function() { sessionStorage.clear(); window.location.href = 'index.html'; };

app.mostrarTela = function(id, titulo) {
    document.querySelectorAll('.modulo-tela').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    if(titulo) document.getElementById('tituloPagina').innerText = titulo;
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
    // Lógica simples para active no menu
    const link = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick')?.includes(id));
    if(link) link.classList.add('active');
};

app.construirMenuLateral = function() {
    const menu = document.getElementById('menuLateral');    if(!menu) return;
    let html = `<a class="nav-link active" onclick="app.mostrarTela('tela_os', 'Pátio Ativo')"><i class="bi bi-kanban"></i> Pátio Kanban</a>`;
    html += `<a class="nav-link" onclick="app.mostrarTela('tela_jarvis', 'J.A.R.V.I.S IA')"><i class="bi bi-robot"></i> Central I.A.</a>`;
    html += `<a class="nav-link" onclick="app.mostrarTela('tela_arquivo', 'Arquivo Morto')"><i class="bi bi-archive"></i> Histórico</a>`;
    
    if (app.t_role !== 'equipe') {
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_crm', 'CRM Clientes')"><i class="bi bi-people"></i> CRM Clientes</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_chat', 'Chat Global')"><i class="bi bi-chat-dots"></i> Chat CRM</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_estoque', 'Almoxarifado')"><i class="bi bi-box-seam"></i> Estoque</a>`;
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_financeiro', 'Financeiro')"><i class="bi bi-bank"></i> DRE & Caixa</a>`;
    }
    if (app.t_role === 'admin') {
        html += `<a class="nav-link" onclick="app.mostrarTela('tela_ia', 'Treinamento IA')"><i class="bi bi-database"></i> Treinar IA</a>`;
    }
    menu.innerHTML = html;
};

// =====================================================================
// 3. CRM E CHAT
// =====================================================================
app.iniciarEscutaCrm = function() {
    app.db.collection('clientes_base').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoCrm = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tb = document.getElementById('tabelaCrmCorpo');
        if(tb) {
            tb.innerHTML = app.bancoCrm.map(c => `<tr><td class="fw-bold text-white">${c.nome}</td><td>${c.telefone}</td><td>${c.documento||'-'}</td><td><span class="badge bg-dark">${c.usuario || '-'}</span></td><td class="text-end"><button class="btn btn-sm btn-info" onclick="app.abrirModalCRM('edit', '${c.id}')"><i class="bi bi-pencil"></i></button></td></tr>`).join('');
        }
        const list = document.getElementById('listaClientesCRM');
        if(list) list.innerHTML = app.bancoCrm.map(c => `<option value="${c.nome}" data-tel="${c.telefone}">`).join('');
        app.renderListaChatCRM();
    });
};

app.abrirModalCRM = function(mode='nova', id='') {
    document.getElementById('c_id').value = '';
    document.getElementById('c_nome').value = ''; document.getElementById('c_tel').value = ''; document.getElementById('c_doc').value = '';
    document.getElementById('c_user').value = ''; document.getElementById('c_pass').value = ''; document.getElementById('c_notas').value = '';
    
    if(mode === 'edit') {
        const c = app.bancoCrm.find(x => x.id === id);
        if(c) {
            document.getElementById('c_id').value = c.id; document.getElementById('c_nome').value = c.nome; document.getElementById('c_tel').value = c.telefone; document.getElementById('c_doc').value = c.documento||'';
            document.getElementById('c_user').value = c.usuario||''; document.getElementById('c_pass').value = c.senha||''; document.getElementById('c_notas').value = c.anotacoes||'';
        }
    }
    new bootstrap.Modal(document.getElementById('modalCrm')).show();
};

app.salvarClienteCRM = async function(e) {
    e.preventDefault();    const id = document.getElementById('c_id').value;
    const payload = { tenantId: app.t_id, nome: document.getElementById('c_nome').value, telefone: document.getElementById('c_tel').value, documento: document.getElementById('c_doc').value, usuario: document.getElementById('c_user').value.trim(), senha: document.getElementById('c_pass').value.trim(), anotacoes: document.getElementById('c_notas').value };
    try {
        if(id) await app.db.collection('clientes_base').doc(id).update(payload);
        else await app.db.collection('clientes_base').add(payload);
        app.showToast("Cliente salvo com sucesso.");
        bootstrap.Modal.getInstance(document.getElementById('modalCrm')).hide();
    } catch(e) { app.showToast("Erro ao salvar: " + e.message, "error"); }
};

app.aoSelecionarClienteOS = function() {
    const nome = document.getElementById('os_cliente').value;
    const c = app.bancoCrm.find(x => x.nome.toLowerCase() === nome.toLowerCase());
    if(c) document.getElementById('os_celular').value = c.telefone;
};

app.iniciarEscutaMensagens = function() {
    app.db.collection('mensagens').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoMensagens = snap.docs.map(d => ({id: d.id, ...d.data()}));
        app.bancoMensagens.sort((a,b) => (a.timestamp?.toMillis()||0) - (b.timestamp?.toMillis()||0));
        let nL = 0;
        app.bancoMensagens.forEach(m => { if(m.sender === 'cliente' && !m.lidaAdmin) nL++; });
        const badge = document.getElementById('chatBadgeGlobal');
        if(badge) { if(nL>0) badge.innerText = nL; else badge.classList.add('d-none'); }
        app.renderListaChatCRM();
        if(app.chatActiveClienteId) app.abrirChatCRM(app.chatActiveClienteId);
    });
};

app.renderListaChatCRM = function() {
    const lista = document.getElementById('chatListaClientesCRM');
    if(!lista) return;
    lista.innerHTML = app.bancoCrm.map(c => {
        const nL = app.bancoMensagens.filter(m => m.clienteId === c.id && m.sender === 'cliente' && !m.lidaAdmin).length;
        return `<div class="p-3 border-bottom border-secondary cursor-pointer hover-bg" style="cursor:pointer" onclick="app.abrirChatCRM('${c.id}')"><div class="d-flex justify-content-between"><strong class="text-white">${c.nome}</strong>${nL?`<span class="badge bg-danger">${nL}</span>`:''}</div><small class="text-white-50">${c.telefone}</small></div>`;
    }).join('');
};

app.abrirChatCRM = function(id) {
    app.chatActiveClienteId = id;
    const cliente = app.bancoCrm.find(c => c.id === id);
    document.getElementById('chatNomeCliente').innerText = "Chat com: " + (cliente ? cliente.nome : 'Desconhecido');
    document.getElementById('chatAreaInputGlobal').classList.remove('d-none');
    const area = document.getElementById('chatAreaMsgGlobal');
    area.innerHTML = '';
    const msgs = app.bancoMensagens.filter(m => m.clienteId === id);
    msgs.forEach(m => {
        if(m.sender === 'cliente' && !m.lidaAdmin) app.db.collection('mensagens').doc(m.id).update({lidaAdmin: true});
        const t = m.timestamp ? new Date(m.timestamp.toDate()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        let content = m.text;        if(m.fileUrl) {
            if(m.fileType === 'image' || m.fileUrl.match(/\.(jpeg|jpg|gif|png)$/)) content = `<img src="${m.fileUrl}" style="max-width:100%; border-radius:5px;">`;
            else if(m.fileType === 'video' || m.fileUrl.match(/\.(mp4)$/)) content = `<video src="${m.fileUrl}" controls style="max-width:100%"></video>`;
            else content = `<a href="${m.fileUrl}" target="_blank" class="btn btn-sm btn-info"><i class="bi bi-file-earmark"></i> Baixar Arquivo</a>`;
        }
        const isMe = m.sender === 'admin';
        area.innerHTML += `<div class="d-flex flex-column mb-2 ${isMe?'align-items-end':'align-items-start'}"><div class="${isMe?'bg-info text-dark':'bg-secondary text-white'} p-2 rounded" style="max-width:75%">${content}</div><small class="text-white-50 small">${t}</small></div>`;
    });
    area.scrollTop = area.scrollHeight;
};

app.enviarMensagemChatGlobal = async function() {
    const input = document.getElementById('inputChatGlobal');
    if(!input.value || !app.chatActiveClienteId) return;
    await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatActiveClienteId, sender: 'admin', text: input.value, lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    input.value = '';
};

app.enviarAnexoChatGlobal = async function() {
    const inp = document.getElementById('chatFileInputGlobal');
    if(!inp.files[0] || !app.chatActiveClienteId) return;
    app.showToast("Enviando...", "warning");
    try {
        const fd = new FormData(); fd.append('file', inp.files[0]); fd.append('upload_preset', app.CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${app.CLOUDINARY_CLOUD_NAME}/auto/upload`, {method:'POST', body:fd});
        const data = await res.json();
        if(data.secure_url) {
            await app.db.collection('mensagens').add({ tenantId: app.t_id, clienteId: app.chatActiveClienteId, sender: 'admin', text: "", fileUrl: data.secure_url, fileType: data.resource_type, lidaCliente: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            inp.value = ''; app.showToast("Anexo enviado!", "success");
        }
    } catch(e) { app.showToast("Erro no upload.", "error"); }
};

// =====================================================================
// 4. ESTOQUE E NF (AQUI ESTAVAM OS BOTÕES FALTANTES)
// =====================================================================
app.iniciarEscutaEstoque = function() {
    app.db.collection('estoque').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoEstoque = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tb = document.getElementById('tabelaEstoqueCorpo');
        if(tb) {
            tb.innerHTML = app.bancoEstoque.map(p => `<tr><td><small class="text-white-50">${p.fornecedor||''}</small><br><span class="badge bg-primary">NF: ${p.nf||'S/N'}</span></td><td class="text-white fw-bold">${p.desc}</td><td>${p.qtd}</td><td class="gestao-only text-danger">R$ ${p.custo.toFixed(2)}</td><td class="text-success fw-bold">R$ ${p.venda.toFixed(2)}</td><td class="admin-only"><button class="btn btn-sm btn-danger" onclick="app.db.collection('estoque').doc('${p.id}').delete()"><i class="bi bi-trash"></i></button></td></tr>`).join('');
        }
        const sel = document.getElementById('selectProdutoEstoque');
        if(sel) {
            sel.innerHTML = '<option value="">Adicionar do Estoque...</option>' + 
                app.bancoEstoque.filter(p=>p.qtd>0).map(p => `<option value="${p.id}" data-v="${p.venda}" data-c="${p.custo}" data-d="${p.desc}">[${p.qtd}x] ${p.desc} (R$ ${p.venda})</option>`).join('');
        }
    });
};
app.abrirModalNF = function() {
    document.getElementById('formNF').reset();
    document.getElementById('corpoItensNF').innerHTML = ''; 
    new bootstrap.Modal(document.getElementById('modalNF')).show();
};

// Função para ler XML
app.processarXML = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = function(e) {
        const xml = new DOMParser().parseFromString(e.target.result, "text/xml");
        const emit = xml.querySelector("emit xNome");
        if(emit) document.getElementById('nf_fornecedor').value = emit.textContent;
        const nNF = xml.querySelector("ide nNF");
        if(nNF) document.getElementById('nf_numero').value = nNF.textContent;
        
        xml.querySelectorAll("det").forEach(d => {
            const desc = d.querySelector("xProd")?.textContent;
            const q = d.querySelector("qCom")?.textContent;
            const c = d.querySelector("vUnCom")?.textContent;
            if(desc) app.adicionarLinhaNF(desc, '', '', q||1, c||0, (c||0)*1.8);
        });
        app.showToast("XML processado!");
    };
    r.readAsText(file);
};

// FUNÇÃO QUE ADICIONA LINHA NA NF
app.adicionarLinhaNF = function(desc, ncm, cfop, qtd, custo, venda) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm bg-dark text-white nf-desc" value="${desc}"></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-white nf-qtd" value="${qtd}"></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-danger nf-custo" value="${custo}"></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-success nf-venda" value="${venda}"></td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-link text-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x-lg"></i></button></td>`;
    document.getElementById('corpoItensNF').appendChild(tr);
};

app.salvarEntradaEstoque = async function(e) {
    e.preventDefault();
    const forn = document.getElementById('nf_fornecedor').value;
    const nf = document.getElementById('nf_numero').value;
    const gerarFin = document.getElementById('nf_gerar_financeiro').checked;
    let total = 0;
    const batch = app.db.batch();
    
    document.querySelectorAll('#corpoItensNF tr').forEach(tr => {        const desc = tr.querySelector('.nf-desc').value;
        const q = parseFloat(tr.querySelector('.nf-qtd').value) || 0;
        const c = parseFloat(tr.querySelector('.nf-custo').value) || 0;
        const v = parseFloat(tr.querySelector('.nf-venda').value) || 0;
        if(desc) {
            total += (q * c);
            batch.set(app.db.collection('estoque').doc(), { tenantId: app.t_id, fornecedor: forn, nf, desc, qtd: q, custo: c, venda: v });
        }
    });
    
    if(gerarFin && total > 0) {
        batch.set(app.db.collection('financeiro').doc(), { tenantId: app.t_id, tipo: 'despesa', desc: `NF ${nf} - ${forn}`, valor: total, vencimento: new Date().toISOString(), status: 'pendente', metodo: 'Boleto' });
    }
    
    await batch.commit();
    app.showToast("Estoque Atualizado!");
    bootstrap.Modal.getInstance(document.getElementById('modalNF')).hide();
};

// =====================================================================
// 5. KANBAN E OS (COM BOTÕES CORRIGIDOS)
// =====================================================================
app.iniciarEscutaOS = function() {
    app.db.collection('ordens_servico').where('tenantId', '==', app.t_id).orderBy('criadoEm', 'desc').onSnapshot(snap => {
        app.bancoOS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        app.renderizarKanban();
    });
};

app.renderizarKanban = function() {
    const cols = { patio:[], orcamento:[], aprovacao:[], box:[], pronto:[], entregue:[] };
    const t = (document.getElementById('buscaGeral').value || '').toLowerCase();
    
    app.bancoOS.forEach(os => {
        if(t && !(os.placa||'').includes(t) && !(os.cliente||'').includes(t)) return;
        const s = os.status || 'patio';
        if(cols[s]) cols[s].push(os);
    });

    for(const k in cols) {
        const el = document.getElementById(`col_${k}`);
        if(el) {
            document.getElementById(`count_${k}`).innerText = cols[k].length;
            el.innerHTML = cols[k].map(os => `
                <div class="os-card" onclick="app.abrirModalOS('edit', '${os.id}')">
                    <div class="d-flex justify-content-between"><strong class="text-white">${os.placa || 'S/PLACA'}</strong><small class="text-white-50">${os.cliente || ''}</small></div>
                    <div class="text-white-50 text-truncate">${os.veiculo || ''}</div>
                </div>`).join('');
        }
    }};

app.abrirModalOS = function(mode='nova', id='') {
    document.getElementById('formOS').reset();
    document.getElementById('listaPecasCorpo').innerHTML = '';
    app.fotosOSAtual = []; app.historicoOSAtual = [];
    document.getElementById('galeriaFotosOS').innerHTML = '';
    document.getElementById('btnDeletarOS').classList.add('d-none');
    
    if(mode === 'edit') {
        const os = app.bancoOS.find(x => x.id === id);
        if(os) {
            document.getElementById('os_id').value = os.id;
            document.getElementById('os_placa').value = os.placa || '';
            document.getElementById('os_veiculo').value = os.veiculo || '';
            document.getElementById('os_cliente').value = os.cliente || '';
            document.getElementById('os_celular').value = os.celular || '';
            document.getElementById('os_status').value = os.status || 'patio';
            document.getElementById('os_relato_cliente').value = os.relatoCliente || '';
            document.getElementById('os_diagnostico').value = os.diagnostico || '';
            if(os.fotos) { app.fotosOSAtual = os.fotos; app.renderizarGaleria(); }
            if(os.pecas) os.pecas.forEach(p => app.adicionarLinhaPeca(p.desc, p.qtd, p.custo, p.venda, p.idEstoque, p.isMaoObra));
            document.getElementById('btnDeletarOS').classList.remove('d-none');
            app.calcularTotalOS();
        }
    } else {
        app.adicionarLinhaPeca('Serviço / Mão de Obra', 1, 0, 0, null, true);
    }
    new bootstrap.Modal(document.getElementById('modalOS')).show();
};

app.adicionarDoEstoque = function() {
    const sel = document.getElementById('selectProdutoEstoque');
    if(!sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    app.adicionarLinhaPeca(opt.dataset.d, 1, parseFloat(opt.dataset.c), parseFloat(opt.dataset.v), sel.value, false);
    sel.value = '';
};

app.adicionarMaoDeObra = function() { app.adicionarLinhaPeca('Serviço / Mão de Obra', 1, 0, 0, null, true); };

// ADICIONADOR INFINITO DE PEÇAS (CORRIGIDO)
app.adicionarLinhaPeca = function(desc, qtd, custo, venda, idEstoque, isMaoObra) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm bg-dark text-white peca-desc" value="${desc}"></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-white peca-qtd" value="${qtd}" min="1" onchange="app.calcularTotalOS()"></td>
        <td class="gestao-only"><input type="number" class="form-control form-control-sm bg-dark text-danger peca-custo" value="${custo}" onchange="app.calcularTotalOS()"></td>
        <td><input type="number" class="form-control form-control-sm bg-dark text-success peca-venda" value="${venda}" onchange="app.calcularTotalOS()"></td>
        <td class="text-end pe-3"><span class="peca-total text-white fw-bold">0.00</span></td>        <td class="text-center"><button type="button" class="btn btn-sm btn-link text-danger p-0" onclick="this.closest('tr').remove(); app.calcularTotalOS()"><i class="bi bi-x"></i></button></td>`;
    document.getElementById('listaPecasCorpo').appendChild(tr);
    app.calcularTotalOS();
};

app.calcularTotalOS = function() {
    let t = 0;
    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||0;
        const v = parseFloat(tr.querySelector('.peca-venda').value)||0;
        const sub = q * v;
        tr.querySelector('.peca-total').innerText = sub.toFixed(2);
        t += sub;
    });
    document.getElementById('os_total_geral').innerText = `R$ ${t.toFixed(2).replace('.',',')}`;
};

app.salvarOS = async function() {
    const id = document.getElementById('os_id').value;
    const pecas = [];
    let totalV = 0, totalC = 0;
    document.querySelectorAll('#listaPecasCorpo tr').forEach(tr => {
        const d = tr.querySelector('.peca-desc').value;
        const q = parseFloat(tr.querySelector('.peca-qtd').value)||0;
        const c = parseFloat(tr.querySelector('.peca-custo').value)||0;
        const v = parseFloat(tr.querySelector('.peca-venda').value)||0;
        if(d) {
            pecas.push({ desc: d, qtd: q, custo: c, venda: v, isMaoObra: !tr.querySelector('.peca-custo').value });
            totalV += (q*v); totalC += (q*c);
        }
    });

    const payload = {
        tenantId: app.t_id, placa: document.getElementById('os_placa').value.toUpperCase(),
        veiculo: document.getElementById('os_veiculo').value, cliente: document.getElementById('os_cliente').value,
        celular: document.getElementById('os_celular').value, status: document.getElementById('os_status').value,
        relatoCliente: document.getElementById('os_relato_cliente').value, diagnostico: document.getElementById('os_diagnostico').value,
        pecas, total: totalV, custoTotal: totalC, fotos: app.fotosOSAtual, 
        ultimaAtualizacao: new Date().toISOString()
    };

    try {
        if(id) await app.db.collection('ordens_servico').doc(id).update(payload);
        else {
            payload.criadoEm = new Date().toISOString();
            payload.historico = [{data: new Date().toISOString(), acao: 'Abertura da O.S.'}];
            await app.db.collection('ordens_servico').add(payload);
        }
        app.showToast("O.S. Salva!");
        bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();    } catch(e) { app.showToast("Erro ao salvar.", "error"); }
};

app.apagarOS = async function() {
    const id = document.getElementById('os_id').value;
    if(id && confirm("Apagar esta O.S.?")) {
        await app.db.collection('ordens_servico').doc(id).delete();
        app.showToast("O.S. removida.");
        bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
    }
};

// =====================================================================
// 6. FINANCEIRO E FATURAMENTO
// =====================================================================
app.abrirFaturamentoDireto = function(id) {
    app.osParaFaturar = app.bancoOS.find(o => o.id === id);
    document.getElementById('fat_valor_total').innerText = `R$ ${(app.osParaFaturar.total||0).toFixed(2).replace('.',',')}`;
    new bootstrap.Modal(document.getElementById('modalFaturamento')).show();
};

app.verificarPgtoOS = function() {
    const f = document.getElementById('fat_metodo').value;
    document.getElementById('fat_div_parcelas').classList.toggle('d-none', !f.includes('Parcelado') && !f.includes('Boleto'));
};

app.processarFaturamentoCompleto = async function() {
    if(!app.osParaFaturar) return;
    const fp = document.getElementById('fat_metodo').value;
    const nP = (fp.includes('Parcelado') || fp.includes('Boleto')) ? (parseInt(document.getElementById('fat_parcelas').value)||1) : 1;
    const total = app.osParaFaturar.total;
    const vP = total / nP;
    const batch = app.db.batch();
    const sts = fp.includes('Pix') || fp.includes('Dinheiro') ? 'pago' : 'pendente';
    const hoje = new Date();

    for(let i=0; i<nP; i++) {
        const v = new Date(hoje); v.setDate(v.getDate() + (i*30));
        batch.set(app.db.collection('financeiro').doc(), {
            tenantId: app.t_id, tipo: 'receita', desc: `O.S. ${app.osParaFaturar.placa} - Parc ${i+1}/${nP}`,
            valor: vP, vencimento: v.toISOString(), status: sts, metodo: fp
        });
    }

    // Baixa estoque
    if(app.osParaFaturar.pecas) {
        for(const p of app.osParaFaturar.pecas) {
            if(p.idEstoque) batch.update(app.db.collection('estoque').doc(p.idEstoque), { qtd: firebase.firestore.FieldValue.increment(-p.qtd) });
        }
    }    
    batch.update(app.db.collection('ordens_servico').doc(app.osParaFaturar.id), { status: 'entregue', baixaEstoqueFeita: true });
    
    await batch.commit();
    app.showToast("Faturado com Sucesso!");
    bootstrap.Modal.getInstance(document.getElementById('modalFaturamento')).hide();
    bootstrap.Modal.getInstance(document.getElementById('modalOS')).hide();
};

app.iniciarEscutaFinanceiro = function() {
    app.db.collection('financeiro').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoFin = snap.docs.map(d => ({id: d.id, ...d.data()}));
        app.renderizarFinanceiroGeral();
    });
};

app.renderizarFinanceiroGeral = function() {
    let rec=0, desp=0;
    const tP = document.getElementById('tabelaPagarCorpo');
    const tR = document.getElementById('tabelaReceberCorpo');
    if(tP) tP.innerHTML = ''; if(tR) tR.innerHTML = '';
    
    app.bancoFin.sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(f => {
        if(f.tipo==='receita') rec += f.valor; else desp += f.valor;
        const html = `<tr><td class="text-white-50">${new Date(f.vencimento).toLocaleDateString()}</td><td class="text-white fw-bold">${f.desc}</td><td>${f.parcelaAtual||1}/${f.totalParcelas||1}</td><td>R$ ${f.valor.toFixed(2)}</td><td><span class="badge bg-${f.status==='pago'?'success':'warning'}">${f.status}</span></td></tr>`;
        if(f.tipo === 'receita' && tR) tR.innerHTML += html;
        if(f.tipo === 'despesa' && tP) tP.innerHTML += html;
    });
    
    document.getElementById('dreReceitas').innerText = `R$ ${rec.toFixed(2)}`;
    document.getElementById('dreDespesas').innerText = `R$ ${desp.toFixed(2)}`;
    document.getElementById('dreLucro').innerText = `R$ ${(rec-desp).toFixed(2)}`;
};

app.abrirModalFinanceiro = function(tipo) {
    document.getElementById('fin_tipo').value = tipo;
    document.getElementById('fin_titulo').innerHTML = tipo === 'receita' ? 'Lançar Receita' : 'Lançar Despesa';
    new bootstrap.Modal(document.getElementById('modalFin')).show();
};

app.verificarPgtoFinManual = function() {
    const f = document.getElementById('fin_metodo').value;
    document.getElementById('divParcelas').classList.toggle('d-none', !f.includes('Parcelado') && !f.includes('Boleto'));
};

app.salvarLancamentoFinanceiro = async function(e) {
    e.preventDefault();
    const tipo = document.getElementById('fin_tipo').value;
    const desc = document.getElementById('fin_desc').value;
    const val = parseFloat(document.getElementById('fin_valor').value);    const fp = document.getElementById('fin_metodo').value;
    const nP = (fp.includes('Parcelado') || fp.includes('Boleto')) ? (parseInt(document.getElementById('fin_parcelas').value)||1) : 1;
    const batch = app.db.batch();
    const sts = fp.includes('Pix') || fp.includes('Dinheiro') ? 'pago' : 'pendente';
    const base = new Date(document.getElementById('fin_data').value || new Date());

    for(let i=0; i<nP; i++) {
        const v = new Date(base); v.setDate(v.getDate() + (i*30));
        batch.set(app.db.collection('financeiro').doc(), {
            tenantId: app.t_id, tipo, desc: nP>1 ? `${desc} - ${i+1}/${nP}` : desc,
            valor: val/nP, vencimento: v.toISOString(), status: sts, metodo: fp
        });
    }
    await batch.commit();
    app.showToast("Lançamento salvo.");
    bootstrap.Modal.getInstance(document.getElementById('modalFin')).hide();
};

// =====================================================================
// 7. ARQUIVO MORTO, EQUIPE E IA
// =====================================================================
app.renderizarTabelaArquivo = function() {
    const tbody = document.getElementById('tabelaArquivoCorpo');
    if(!tbody) return;
    const entregues = app.bancoOS.filter(os => os.status === 'entregue');
    tbody.innerHTML = entregues.map(os => `<tr><td>${new Date(os.ultimaAtualizacao).toLocaleDateString()}</td><td class="fw-bold text-white">${os.placa}</td><td>${os.veiculo}</td><td>${os.cliente}</td><td class="gestao-only">R$ ${os.total?.toFixed(2)}</td><td><button class="btn btn-sm btn-info" onclick="app.abrirModalOS('edit', '${os.id}')"><i class="bi bi-eye"></i></button></td></tr>`).join('');
};

app.iniciarEscutaEquipe = function() {
    app.db.collection('funcionarios').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        const tb = document.getElementById('tabelaEquipe');
        if(!tb) return;
        tb.innerHTML = snap.docs.map(d => {
            const f = d.data();
            return `<tr><td>${f.nome}</td><td>${f.role}</td><td>${f.comissao}%</td><td><button class="btn btn-sm btn-danger" onclick="app.db.collection('funcionarios').doc('${d.id}').delete()">Revogar</button></td></tr>`;
        }).join('');
    });
};

app.salvarFuncionario = async function(e) {
    e.preventDefault();
    await app.db.collection('funcionarios').add({
        tenantId: app.t_id, nome: document.getElementById('f_nome').value, role: document.getElementById('f_cargo').value,
        comissao: document.getElementById('f_comissao').value, usuario: document.getElementById('f_user').value, senha: document.getElementById('f_pass').value
    });
    app.showToast("Acesso criado.");
    bootstrap.Modal.getInstance(document.getElementById('modalEquipe')).hide();
};

app.iniciarEscutaIA = function() {    app.db.collection('conhecimento_ia').where('tenantId', '==', app.t_id).onSnapshot(snap => {
        app.bancoIA = snap.docs.map(d => ({id:d.id, ...d.data()}));
        const div = document.getElementById('listaConhecimentosIA');
        if(div) div.innerHTML = app.bancoIA.map(ia => `<div class="d-flex justify-content-between bg-dark p-2 mb-1 border border-secondary rounded"><span class="text-white-50 text-truncate">${ia.texto}</span><button class="btn btn-sm btn-danger" onclick="app.db.collection('conhecimento_ia').doc('${ia.id}').delete()"><i class="bi bi-trash"></i></button></div>`).join('');
    });
};

app.salvarConhecimentoIA = async function(txt) {
    const val = txt || document.getElementById('iaConhecimentoTexto').value;
    if(!val) return;
    await app.db.collection('conhecimento_ia').add({ tenantId: app.t_id, texto: val, data: new Date().toISOString() });
    app.showToast("Aprendizado injetado.");
    document.getElementById('iaConhecimentoTexto').value = '';
};

app.processarArquivoParaIA = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const r = new FileReader();
    r.onload = async e => {
        await app.salvarConhecimentoIA(`[Manual: ${file.name}] ${e.target.result.substring(0, 2000)}`);
        document.getElementById('iaFileStatus').innerText = "Processado!";
    };
    r.readAsText(file);
};

app.perguntarJarvis = async function() {
    const input = document.getElementById('jarvisInput');
    const resp = document.getElementById('jarvisResposta');
    if(!input.value) return;
    resp.innerHTML = `<p class="text-info"><i class="bi bi-three-dots"></i> Pensando...</p>`;
    
    if(!app.API_KEY_GEMINI) { resp.innerHTML = `<p class="text-danger">Erro: Chave da API do Google não configurada na sessão.</p>`; return; }

    try {
        const ctx = app.bancoIA.map(i => i.texto).join('\n');
        const prompt = `Você é o Jarvis da oficina ${app.t_nome}. Contexto técnico: ${ctx}. Pergunta: ${input.value}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${app.API_KEY_GEMINI}`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const d = await res.json();
        resp.innerHTML = `<p class="text-white">${d.candidates[0].content.parts[0].text.replace(/\n/g, '<br>')}</p>`;
    } catch(e) { resp.innerHTML = `<p class="text-danger">Erro ao conectar com a IA.</p>`; }
};

app.jarvisAnalisarRevisoes = async function() {
    const div = document.getElementById('jarvisCRMInsights');
    div.innerHTML = `<span class="text-info">Escaneando histórico...</span>`;
    const hist = app.bancoOS.filter(o => o.status === 'entregue');
    if(hist.length < 2) { div.innerHTML = "Histórico insuficiente."; return; }    const dados = hist.slice(0, 5).map(h => `${h.cliente} - ${h.veiculo} (${new Date(h.ultimaAtualizacao).toLocaleDateString()})`).join('\n');
    div.innerHTML = "Análise feita. (Simulação: Entrar em contato com clientes da lista para revisão de 6 meses)";
};

// FUNÇÃO PARA ADICIONAR FOTO NO CLOUDINARY
app.configurarCloudinary = function() {
    if(!app.CLOUDINARY_CLOUD_NAME || !app.CLOUDINARY_UPLOAD_PRESET) return;
    var w = cloudinary.createUploadWidget({ cloudName: app.CLOUDINARY_CLOUD_NAME, uploadPreset: app.CLOUDINARY_UPLOAD_PRESET }, (err, res) => {
        if (!err && res && res.event === "success") {
            app.fotosOSAtual.push(res.info.secure_url);
            app.renderizarGaleria();
        }
    });
    const btn = document.getElementById("btnUploadCloudinary");
    if(btn) btn.addEventListener("click", () => w.open(), false);
};

app.renderizarGaleria = function() {
    const gal = document.getElementById('galeriaFotosOS');
    if(gal) gal.innerHTML = app.fotosOSAtual.map(url => `<div style="width:60px; height:60px; overflow:hidden;" class="rounded"><img src="${url}" class="w-100 h-100 object-fit-cover"></div>`).join('');
};