// =====================================================================
// APP SUPER ADMIN - thIAguinho.Digital SaaS
// =====================================================================

window.app = window.app || {};

// 1. CONFIGURAÇÃO FIREBASE
app.firebaseConfig = {
    apiKey: "AIzaSyBqIuCsHHuy_f-mBWV4JBkbyOorXpqQvqg",
    authDomain: "hub-thiaguinho.firebaseapp.com",
    projectId: "hub-thiaguinho",
    storageBucket: "hub-thiaguinho.firebasestorage.app",
    messagingSenderId: "453508098543",
    appId: "1:453508098543:web:305f4d48edd9be40bd6e1a"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(app.firebaseConfig);
}
app.db = firebase.firestore();

// 2. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    console.log("Super Admin iniciado!");
    app.carregarDashboardStats();
    app.carregarListaClientes();
    app.carregarFinanceiroMaster();
    app.configurarListenersFormularios();
});

// 3. NAVEGAÇÃO ENTRE SEÇÕES
app.mostrarSecao = function(id) {
    console.log("Navegando para:", id);
    // Esconde todas as seções
    document.querySelectorAll('.secao').forEach(el => {
        el.style.display = 'none';
    });
    
    // Mostra a seção desejada
    const secaoAlvo = document.getElementById('secao-' + id);
    if (secaoAlvo) {
        secaoAlvo.style.display = 'block';
    }
    
    // Atualiza menu ativo
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active');
    });
};

// 4. SAIR DO SISTEMA
app.sair = function() {
    sessionStorage.clear();
    window.location.href = 'index.html';
};

// 5. DASHBOARD - CONTAR CLIENTES
app.carregarDashboardStats = function() {
    console.log("Carregando stats...");
    app.db.collection('oficinas').onSnapshot(snap => {
        let ativos = 0;
        let suspensos = 0;
        
        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Liberado' || data.status === 'ativo') {
                ativos++;
            } else {
                suspensos++;
            }
        });
        
        const elAtivos = document.getElementById('lblAtivos');
        const elSuspensos = document.getElementById('lblSuspensos');
        const elTotal = document.getElementById('lblTotalAmbientes');
        
        if (elAtivos) elAtivos.innerText = ativos;
        if (elSuspensos) elSuspensos.innerText = suspensos;
        if (elTotal) elTotal.innerText = snap.size;
        
        // Atualiza select do onboarding
        app.atualizarSelectOnboarding(snap);
    }, error => {
        console.error("Erro ao carregar stats:", error);
    });
};

// 6. ATUALIZAR SELECT DE EMPRESAS (ONBOARDING)
app.atualizarSelectOnboarding = function(snap) {
    const sel = document.getElementById('selectEmpresaOnboarding');
    if (!sel) return;
    
    sel.innerHTML = '<option value="">Escolha a Empresa...</option>';
    snap.forEach(doc => {
        const nome = doc.data().nome || 'Sem nome';
        sel.innerHTML += `<option value="${doc.id}">${nome}</option>`;
    });
};

// 7. LISTAR CLIENTES NA TABELA
app.carregarListaClientes = function() {
    console.log("Carregando lista de clientes...");
    app.db.collection('oficinas').onSnapshot(snap => {
        const tbody = document.getElementById('tabelaClientesCorpo');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Nenhum cliente cadastrado ainda.</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const d = doc.data();
            const statusClass = (d.status === 'Liberado' || d.status === 'ativo') ? 'bg-success' : 'bg-danger';
            const statusText = d.status || 'Liberado';
            
            const row = `
                <tr>
                    <td class="text-muted small font-monospace">${doc.id.substr(0,8)}...</td>
                    <td class="fw-bold text-white">${d.nome || 'Sem nome'}</td>
                    <td><span class="badge bg-dark text-info">${d.nicho || 'N/A'}</span></td>
                    <td>${d.usuarioAdmin || '-'}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" onclick="alert('ID: ${doc.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }, error => {
        console.error("Erro ao carregar clientes:", error);
    });
};

// 8. FINANCEIRO MASTER
app.carregarFinanceiroMaster = function() {
    console.log("Carregando financeiro master...");
    app.db.collection('financeiro_master')
        .orderBy('data', 'desc')
        .onSnapshot(snap => {
            const tbody = document.getElementById('tabelaFinanceiroMasterCorpo');
            const lblRec = document.getElementById('lblReceitas');
            const lblDesp = document.getElementById('lblDespesas');
            const lblLucro = document.getElementById('lblLucro');
            
            if (!tbody) return;
            
            tbody.innerHTML = '';
            let totalRec = 0;
            let totalDesp = 0;
            
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Sem lançamentos.</td></tr>';
            } else {
                snap.forEach(doc => {
                    const d = doc.data();
                    if (d.tipo === 'ENTRADA') totalRec += (d.valor || 0);
                    if (d.tipo === 'SAIDA') totalDesp += (d.valor || 0);
                    
                    const cor = d.tipo === 'ENTRADA' ? 'text-success' : 'text-danger';
                    const row = `
                        <tr>
                            <td>${d.data || '-'}</td>
                            <td><span class="badge ${d.tipo === 'ENTRADA' ? 'bg-success' : 'bg-danger'}">${d.tipo}</span></td>
                            <td class="text-white">${d.desc || '-'}</td>
                            <td>${d.metodo || '-'}</td>
                            <td class="fw-bold ${cor}">R$ ${(d.valor || 0).toFixed(2)}</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="app.deletarLancamento('${doc.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tbody.innerHTML += row;
                });
            }
            
            if (lblRec) lblRec.innerText = 'R$ ' + totalRec.toFixed(2).replace('.', ',');
            if (lblDesp) lblDesp.innerText = 'R$ ' + totalDesp.toFixed(2).replace('.', ',');
            if (lblLucro) lblLucro.innerText = 'R$ ' + (totalRec - totalDesp).toFixed(2).replace('.', ',');
        }, error => {
            console.error("Erro ao carregar financeiro:", error);
        });
};

// 9. DELETAR LANÇAMENTO FINANCEIRO
app.deletarLancamento = async function(id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        try {
            await app.db.collection('financeiro_master').doc(id).delete();
            alert('Lançamento excluído!');
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert('Erro: ' + error.message);
        }
    }
};

// 10. CONFIGURAR EVENTOS DOS FORMULÁRIOS
app.configurarListenersFormularios = function() {
    console.log("Configurando listeners...");
    
    // Botão Implantar Sistema
    const btnImplantar = document.getElementById('btnImplantar');
    if (btnImplantar) {
        btnImplantar.addEventListener('click', app.implantarSistema);
    }
    
    // Botão Lançar Financeiro
    const btnLancarMaster = document.getElementById('btnLancarMaster');
    if (btnLancarMaster) {
        btnLancarMaster.addEventListener('click', app.lancarFinanceiroMaster);
    }
    
    // Botão Injetar Dados
    const btnInjetar = document.getElementById('btnInjetarDados');
    if (btnInjetar) {
        btnInjetar.addEventListener('click', app.injetarDadosOnboarding);
    }
};

// 11. AÇÃO: IMPLANTAR SISTEMA
app.implantarSistema = async function() {
    console.log("Iniciando implantação...");
    
    const nomeEmpresa = document.getElementById('nomeEmpresa')?.value || '';
    const whatsapp = document.getElementById('whatsappFaturamento')?.value || '';
    const nicho = document.getElementById('nichoOperacional')?.value || '';
    const usuario = document.getElementById('usuarioAdmin')?.value || '';
    const senha = document.getElementById('senhaAdmin')?.value || '';
    const status = document.getElementById('statusSistema')?.value || 'Liberado';
    
    if (!nomeEmpresa || !usuario || !senha) {
        alert('Preencha: Nome da Empresa, Usuário Admin e Senha!');
        return;
    }
    
    if (!confirm(`Criar sistema para "${nomeEmpresa}"?\n\nLogin: ${usuario}`)) {
        return;
    }
    
    const btn = document.getElementById('btnImplantar');
    btn.disabled = true;
    btn.innerText = 'Implantando...';
    
    try {
        // Coleta módulos
        const modulos = {
            financeiro: document.getElementById('moduloFinanceiro')?.checked || false,
            crm: document.getElementById('moduloCRM')?.checked || false,
            estoqueVendas: document.getElementById('moduloEstoqueVendas')?.checked || false,
            estoqueInterno: document.getElementById('moduloEstoqueInterno')?.checked || false,
            kanban: document.getElementById('moduloKanban')?.checked || false,
            pdf: document.getElementById('moduloPDF')?.checked || false,
            chat: document.getElementById('moduloChat')?.checked || false,
            ia: document.getElementById('moduloIA')?.checked || false
        };
        
        // Configurações
        const config = {
            geminiKey: document.getElementById('geminiKey')?.value || null,
            cloudinaryName: document.getElementById('cloudinaryName')?.value || 'dmuvm1o6m',
            cloudinaryPreset: document.getElementById('cloudinaryPreset')?.value || 'evolution'
        };
        
        // Cria no Firestore
        const tenantRef = await app.db.collection('oficinas').add({
            nome: nomeEmpresa,
            nicho: nicho,
            whatsapp: whatsapp,
            status: status,
            usuarioAdmin: usuario,
            senhaAdmin: senha,
            modulos: modulos,
            configuracoes: config,
            dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
            ultimoAcesso: null
        });
        
        alert(`✅ SUCESSO!\n\nCliente criado!\nID: ${tenantRef.id}\n\nO cliente já pode fazer login!`);
        
        // Limpa formulário
        document.getElementById('nomeEmpresa').value = '';
        document.getElementById('whatsappFaturamento').value = '';
        document.getElementById('usuarioAdmin').value = '';
        document.getElementById('senhaAdmin').value = '';
        
        // Volta para dashboard
        app.mostrarSecao('dashboard');
        
    } catch (error) {
        console.error("Erro ao implantar:", error);
        alert('Erro: ' + error.message);
    } finally {
        const btn = document.getElementById('btnImplantar');
        btn.disabled = false;
        btn.innerText = 'IMPLANTAR SISTEMA NA NUVEM';
    }
};

// 12. AÇÃO: LANÇAR FINANCEIRO MASTER
app.lancarFinanceiroMaster = async function() {
    const tipo = document.getElementById('tipoFinanceiroMaster')?.value || 'ENTRADA';
    const desc = document.getElementById('descFinanceiroMaster')?.value || '';
    const valor = parseFloat(document.getElementById('valorFinanceiroMaster')?.value || 0);
    const metodo = document.getElementById('metodoFinanceiroMaster')?.value || 'Pix / Transferência';
    const data = document.getElementById('dataFinanceiroMaster')?.value || new Date().toISOString().split('T')[0];
    
    if (!desc || valor <= 0) {
        alert('Preencha descrição e valor!');
        return;
    }
    
    try {
        await app.db.collection('financeiro_master').add({
            tipo: tipo,
            desc: desc,
            valor: valor,
            metodo: metodo,
            data: data,
            dataRegistro: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Lançamento registrado!');
        
        // Fecha modal (se existir)
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalFinanceiroMaster'));
        if (modal) modal.hide();
        
        // Limpa campos
        document.getElementById('descFinanceiroMaster').value = '';
        document.getElementById('valorFinanceiroMaster').value = '';
        
    } catch (error) {
        console.error("Erro financeiro:", error);
        alert('Erro: ' + error.message);
    }
};

// 13. AÇÃO: INJETAR DADOS (ONBOARDING)
app.injetarDadosOnboarding = async function() {
    const tenantSelect = document.getElementById('selectEmpresaOnboarding');
    const moduloDestino = document.getElementById('selectModuloDestino')?.value || 'crm';
    const jsonStr = document.getElementById('jsonInput')?.value || '';
    
    if (!tenantSelect || tenantSelect.value === "") {
        alert('Selecione uma empresa!');
        return;
    }
    
    if (!jsonStr) {
        alert('Cole o JSON!');
        return;
    }
    
    if (!confirm('Isso vai escrever no banco do cliente. Continuar?')) {
        return;
    }
    
    const btn = document.getElementById('btnInjetarDados');
    btn.disabled = true;
    btn.innerText = 'Injetando...';
    
    try {
        const dados = JSON.parse(jsonStr);
        const tenantId = tenantSelect.value;
        
        // Mapeia coleção
        let collectionName = "";
        if (moduloDestino === "crm") collectionName = "clientes_base";
        else if (moduloDestino === "estoque") collectionName = "estoque";
        else if (moduloDestino === "historico") collectionName = "ordens_servico";
        else throw new Error("Módulo desconhecido");
        
        const batch = app.db.batch();
        let count = 0;
        
        if (Array.isArray(dados)) {
            dados.forEach(item => {
                const docRef = app.db.collection(collectionName).doc();
                item.tenantId = tenantId;
                batch.set(docRef, item);
                count++;
            });
        } else {
            const docRef = app.db.collection(collectionName).doc();
            dados.tenantId = tenantId;
            batch.set(docRef, dados);
            count = 1;
        }
        
        await batch.commit();
        
        alert(`✅ Injeção concluída!\n${count} itens enviados.`);
        
        document.getElementById('jsonInput').value = '';
        
    } catch (e) {
        console.error(e);
        alert('Erro no JSON: ' + e.message);
    } finally {
        const btn = document.getElementById('btnInjetarDados');
        btn.disabled = false;
        btn.innerText = 'INJETAR DADOS NA NUVEM';
    }
};

// 14. ABRIR MODAL FINANCEIRO
app.abrirModalFinanceiro = function(tipo) {
    const modalEl = document.getElementById('modalFinanceiroMaster');
    if (!modalEl) {
        alert('Modal não encontrado!');
        return;
    }
    
    // Define o tipo
    const tipoField = document.getElementById('tipoFinanceiroMaster');
    if (tipoField) tipoField.value = tipo;
    
    // Atualiza título
    const titulo = document.getElementById('modalFinanceiroTitulo');
    if (titulo) {
        titulo.innerText = tipo === 'ENTRADA' ? 'Lançar Recebimento' : 'Lançar Pagamento';
    }
    
    // Mostra modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

console.log("app_superadmin.js carregado com sucesso!");
