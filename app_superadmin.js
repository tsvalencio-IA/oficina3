window.app = {};

// =====================================================================
// 1. CONFIGURAÇÃO FIREBASE (MESMA DO SEU SISTEMA)
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

// =====================================================================
// 2. INICIALIZAÇÃO
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificação de Segurança: O usuário logou como Super Admin?
    // Assumindo que no index.html você salvou t_role = 'superadmin' se for o caso
    const sessionRole = sessionStorage.getItem('t_role');
    if (sessionRole !== 'superadmin' && sessionRole !== 'admin') {
        // Se quiser forçar login, descomente a linha abaixo:
        // window.location.replace('index.html'); 
        console.warn("Modo Debug: Sem sessão de Super Admin detectada, permitindo acesso.");
    }

    app.carregarDashboardStats();
    app.carregarListaClientes();
    app.carregarFinanceiroMaster();
    app.configurarListenersFormularios();
});

// =====================================================================
// 3. LABORATÓRIO: CRIAÇÃO DE NOVOS CLIENTES (TENANTS)
// =====================================================================
app.configurarListenersFormularios = function() {
    
    // Botão: IMPLANTAR SISTEMA NA NUVEM
    const btnImplantar = document.getElementById('btnImplantar');
    if (btnImplantar) {
        btnImplantar.addEventListener('click', async function() {
            // Pegar dados do formulário
            const nomeEmpresa = document.getElementById('nomeEmpresa').value;
            const whatsapp = document.getElementById('whatsappFaturamento').value;
            const nicho = document.getElementById('nichoOperacional').value;
            const usuario = document.getElementById('usuarioAdmin').value;
            const senha = document.getElementById('senhaAdmin').value;
            const status = document.getElementById('statusSistema').value; // Liberado ou Bloqueado
            
            // Módulos (Booleanos)
            const modulos = {
                financeiro: document.getElementById('moduloFinanceiro').checked,
                crm: document.getElementById('moduloCRM').checked,
                estoqueVendas: document.getElementById('moduloEstoqueVendas').checked,
                estoqueInterno: document.getElementById('moduloEstoqueInterno').checked,
                kanban: document.getElementById('moduloKanban').checked,
                pdf: document.getElementById('moduloPDF').checked,
                chat: document.getElementById('moduloChat').checked,
                ia: document.getElementById('moduloIA').checked
            };

            // Configurações
            const config = {
                geminiKey: document.getElementById('geminiKey').value || null,
                cloudinaryName: document.getElementById('cloudinaryName').value || 'dmuvm1o6m',
                cloudinaryPreset: document.getElementById('cloudinaryPreset').value || 'evolution'
            };

            if (!nomeEmpresa || !usuario || !senha) {
                alert("Preencha Nome, Usuário Admin e Senha!");
                return;
            }

            if (confirm(`Tem certeza que deseja criar o ERP para "${nomeEmpresa}"?\nIsso gerará credenciais de acesso na nuvem.`)) {
                btnImplantar.disabled = true;
                btnImplantar.innerText = "Implantando...";

                try {
                    // 1. Criar o Tenant na coleção 'oficinas'
                    const tenantRef = await app.db.collection('oficinas').add({
                        nome: nomeEmpresa,
                        nicho: nicho,
                        whatsapp: whatsapp,
                        status: status, // 'ativo' ou 'suspenso'
                        usuarioAdmin: usuario,
                        senhaAdmin: senha, // Em produção real, isso deve ser criptografado
                        modulos: modulos,
                        configuracoes: config,
                        dataCriacao: firebase.firestore.FieldValue.serverTimestamp(),
                        ultimoAcesso: null
                    });

                    // 2. Criar um usuário inicial na coleção de usuários do sistema (se aplicável)
                    // ou apenas confiar que o painel do cliente valida 'usuarioAdmin' do documento.
                    
                    alert(`✅ SUCESSO!\nCliente "${nomeEmpresa}" criado.\nID do Banco: ${tenantRef.id}\nLogin Admin: ${usuario}`);
                    
                    // Limpar formulário
                    document.getElementById('formSuperAdmin')?.reset(); // Se houver ID no form
                    location.reload(); // Recarrega para atualizar a lista

                } catch (error) {
                    console.error("Erro ao implantar:", error);
                    alert("Erro ao salvar: " + error.message);
                } finally {
                    btnImplantar.disabled = false;
                    btnImplantar.innerText = "IMPLANTAR SISTEMA NA NUVEM";
                }
            }
        });
    }

    // Botão: CONFIRMAR E PROCESSAR NO CAIXA (Financeiro Master)
    const btnFinanceiro = document.getElementById('btnLancarMaster');
    if(btnFinanceiro) {
        btnFinanceiro.addEventListener('click', async function() {
            const tipo = document.getElementById('tipoFinanceiroMaster').value; // ENTRADA ou SAIDA
            const descricao = document.getElementById('descFinanceiroMaster').value;
            const valor = parseFloat(document.getElementById('valorFinanceiroMaster').value);
            const metodo = document.getElementById('metodoFinanceiroMaster').value;
            const dataRef = document.getElementById('dataFinanceiroMaster').value;

            if (!valor || !descricao) {
                alert("Preencha descrição e valor!");
                return;
            }

            try {
                await app.db.collection('financeiro_master').add({
                    tipo: tipo,
                    desc: descricao,
                    valor: valor,
                    metodo: metodo,
                    data: dataRef || new Date().toISOString().split('T')[0],
                    dataRegistro: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Lançamento registrado no caixa da Agência!");
                location.reload();
            } catch (error) {
                alert("Erro financeiro: " + error.message);
            }
        });
    }

    // Botão: INJETAR DADOS (Onboarding)
    const btnInjetar = document.getElementById('btnInjetarDados');
    if(btnInjetar) {
        btnInjetar.addEventListener('click', async function() {
            const tenantSelect = document.getElementById('selectEmpresaOnboarding');
            const moduloDestino = document.getElementById('selectModuloDestino').value;
            const jsonStr = document.getElementById('jsonInput').value;

            if (!tenantSelect.value || tenantSelect.value === "") {
                alert("Selecione uma empresa!");
                return;
            }
            if (!jsonStr) {
                alert("Cole o JSON!");
                return;
            }

            if (confirm("Isso vai escrever diretamente no banco do cliente. Continuar?")) {
                btnInjetar.disabled = true;
                btnInjetar.innerText = "Injetando...";
                
                try {
                    const dados = JSON.parse(jsonStr);
                    const batch = app.db.batch();
                    const tenantId = tenantSelect.value;
                    
                    // Mapeia o nome do módulo para o nome da coleção real no banco
                    let collectionName = "";
                    if(moduloDestino === "crm") collectionName = "clientes_base";
                    else if(moduloDestino === "estoque") collectionName = "estoque";
                    else if(moduloDestino === "historico") collectionName = "ordens_servico";
                    else throw new Error("Módulo desconhecido");

                    // Se for um array, adiciona tudo
                    if(Array.isArray(dados)) {
                        dados.forEach(item => {
                            const docRef = app.db.collection(collectionName).doc(); // Gera ID automático
                            // Adiciona o tenantId ao documento para segurança
                            item.tenantId = tenantId; 
                            batch.set(docRef, item);
                        });
                    } else {
                        // Se for um objeto único
                        dados.tenantId = tenantId;
                        const docRef = app.db.collection(collectionName).doc();
                        batch.set(docRef, dados);
                    }

                    await batch.commit();
                    alert(`✅ Injeção concluída! ${Array.isArray(dados) ? dados.length : 1} itens enviados.`);
                } catch (e) {
                    console.error(e);
                    alert("Erro no JSON ou na injeção: " + e.message);
                } finally {
                    btnInjetar.disabled = false;
                    btnInjetar.innerText = "INJETAR DADOS NA NUVEM";
                }
            }
        });
    }
};

// =====================================================================
// 4. LISTENERS EM TEMPO REAL (DASHBOARD)
// =====================================================================

// A. Contar Clientes (Licenças)
app.carregarDashboardStats = function() {
    app.db.collection('oficinas').onSnapshot(snap => {
        let ativos = 0, suspensos = 0;
        snap.forEach(doc => {
            if(doc.data().status === 'ativo' || doc.data().status === 'Liberado') ativos++;
            else suspensos++;
        });
        
        // Atualizar DOM (IDs baseados no seu HTML superadmin)
        const elAtivos = document.getElementById('lblAtivos');
        const elSuspensos = document.getElementById('lblSuspensos');
        
        if(elAtivos) elAtivos.innerText = ativos;
        if(elSuspensos) elSuspensos.innerText = suspensos;

        // Atualiza o Select do Onboarding
        app.atualizarSelectOnboarding(snap);
    });
};

app.atualizarSelectOnboarding = function(snap) {
    const sel = document.getElementById('selectEmpresaOnboarding');
    if(sel) {
        sel.innerHTML = '<option value="">Escolha a Empresa...</option>';
        snap.forEach(doc => {
            sel.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`;
        });
    }
};

// B. Listar Tabela de Clientes
app.carregarListaClientes = function() {
    app.db.collection('oficinas').onSnapshot(snap => {
        const tbody = document.getElementById('tabelaClientesCorpo');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const statusClass = (d.status === 'Liberado' || d.status === 'ativo') ? 'bg-success' : 'bg-danger';
            const statusText = d.status || 'Liberado';
            
            // Monta o link para acessar o painel do cliente direto (simulação)
            // O ideal é que o cliente faça login, mas aqui você como admin pode "ver" a estrutura
            const row = `<tr>
                <td class="text-muted small font-monospace">${doc.id}</td>
                <td class="fw-bold text-white">${d.nome}</td>
                <td><span class="badge bg-dark text-info">${d.nicho || 'N/A'}</span></td>
                <td>${d.usuarioAdmin || '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="alert('ID: ${doc.id}')"><i class="bi bi-eye"></i></button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });
    });
};

// C. Financeiro do Super Admin (Caixa da Agência)
app.carregarFinanceiroMaster = function() {
    app.db.collection('financeiro_master').orderBy('data', 'desc').onSnapshot(snap => {
        const tbody = document.getElementById('tabelaFinanceiroMasterCorpo');
        const lblRec = document.getElementById('lblReceitas');
        const lblDesp = document.getElementById('lblDespesas');
        const lblLucro = document.getElementById('lblLucro');

        if(!tbody) return;
        tbody.innerHTML = '';
        
        let totalRec = 0, totalDesp = 0;

        snap.forEach(doc => {
            const d = doc.data();
            if(d.tipo === 'ENTRADA') totalRec += d.valor;
            if(d.tipo === 'SAIDA') totalDesp += d.valor;

            const cor = d.tipo === 'ENTRADA' ? 'text-success' : 'text-danger';
            tbody.innerHTML += `<tr>
                <td>${d.data}</td>
                <td class="${cor}">${d.tipo}</td>
                <td class="text-white">${d.desc}</td>
                <td>${d.metodo}</td>
                <td class="fw-bold ${cor}">R$ ${d.valor.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-danger btn-delete-fm" data-id="${doc.id}"><i class="bi bi-trash"></i></button></td>
            </tr>`;
        });

        if(lblRec) lblRec.innerText = `R$ ${totalRec.toFixed(2)}`;
        if(lblDesp) lblDesp.innerText = `R$ ${totalDesp.toFixed(2)}`;
        if(lblLucro) lblLucro.innerText = `R$ ${(totalRec - totalDesp).toFixed(2)}`;

        // Listener para deletar
        document.querySelectorAll('.btn-delete-fm').forEach(btn => {
            btn.onclick = async function() {
                if(confirm('Apagar lançamento?')) {
                    await app.db.collection('financeiro_master').doc(this.dataset.id).delete();
                }
            }
        });
    });
};

// Função utilitária para formatar dinheiro se necessário
app.formatMoney = function(v) {
    return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
