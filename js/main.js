/**
 * CAMADA DE INTERFACE (ORQUESTRAÇÃO DO DOM)
 * -----------------------------------------
 * Responsável apenas por conectar os elementos HTML às regras
 * internas do domínio e à camada de armazenamento.
 */

import {
    carregarMovimentacoesLocais,
    salvarMovimentacoesLocais,
    carregarCategoriasLocais,
    salvarCategoriasLocais,
    carregarPerfilDeAcessoLocal,
    salvarPerfilDeAcessoLocal,
    resetarTodosOsDadosLocais,
} from './storage.js';

import {
    validarNomeDoUsuario,
    obterCategoriasPadrao,
    filtrarCategoriasPorTipo,
    adicionarNovaCategoria,
    excluirCategoriaPorId,
    validarDadosDaMovimentacao,
    criarNovaMovimentacao,
    atualizarMovimentacaoPorId,
    excluirMovimentacaoPorId,
    excluirMovimentacoesPorMes,
    limparTodoHistoricoDeMovimentacoes,
    ordenarMovimentacoesPorDataMaisRecente,
    extrairMesesComMovimentacoes,
    filtrarMovimentacoesPorMes,
    calcularSaldoEntradasESaidas,
    agruparMovimentacoesPorCategoria,
    calcularIndicadoresDoDashboard,
    agruparFluxoMensalDeReceitasEDespesas,
    formatarValorEmReais,
    formatarEntradaMonetariaBRL,
    formatarNomeDoMes,
    formatarDataCurtaBR,
    obterDataDeHojeISO,
} from './financeDomain.js';

import {
    obterCorDaCategoria,
    renderizarGraficoDonutDeCategorias,
    renderizarGraficoBarrasMensais,
} from './dashboardCharts.js';

const VALOR_OPCAO_NOVA_CATEGORIA = '__nova_categoria__';

// Carrega categorias salvas ou inicializa com as padrões na primeira abertura
function inicializarCategorias() {
    const categoriasSalvas = carregarCategoriasLocais();
    if (Array.isArray(categoriasSalvas) && categoriasSalvas.length > 0) {
        return categoriasSalvas;
    }

    const padrao = obterCategoriasPadrao();
    salvarCategoriasLocais(padrao);
    return padrao;
}

// Estado central da aplicação
const estadoDaAplicacao = {
    movimentacoes: carregarMovimentacoesLocais(),
    categorias: inicializarCategorias(),
    mesSelecionado: 'all', // 'all' ou 'YYYY-MM'
    tipoFormularioAtivo: 'expense', // 'expense' ou 'income'
    categoriaPendenteExclusaoId: null,

    // Estado do Modal de Vidro Fosco
    movimentacaoAbertaNoModalId: null,
    acaoPendenteNoModal: null, // 'edit' | 'delete' | null
    dadosPendentesParaEdicao: null,

    // Estado do Dashboard
    abaRankingAtiva: 'expense', // 'expense' | 'income'

    // Estado do Perfil e Ações da Conta
    perfilDeAcesso: carregarPerfilDeAcessoLocal(),
    acaoPendenteConta: null, // { tipo: 'rename' | 'delete-month' | 'delete-all-history' | 'reset-account', payload }
    ultimaMovimentacaoAdicionadaId: null,
    ultimaMovimentacaoEditadaId: null,
};

// Referências dos elementos da tela
const elementos = {
    // Header
    saudacaoUsuario: document.getElementById('saudacao-usuario'),
    filtroMes: document.getElementById('filtro-mes'),
    btnInstalarApp: document.getElementById('btn-instalar-app'),
    btnEditarPerfil: document.getElementById('btn-editar-perfil'),

    // 3 Painéis
    cardSaldo: document.querySelector('.card-balance'),
    cardReceitas: document.querySelector('.card-income'),
    cardDespesas: document.querySelector('.card-expense'),
    valorSaldo: document.getElementById('valor-saldo'),
    infoSaldo: document.getElementById('info-saldo'),
    valorReceitas: document.getElementById('valor-receitas'),
    infoReceitas: document.getElementById('info-receitas'),
    valorDespesas: document.getElementById('valor-despesas'),
    infoDespesas: document.getElementById('info-despesas'),

    // Formulário
    formulario: document.getElementById('form-movimentacao'),
    radiosTipo: document.querySelectorAll('input[name="tipo"]'),
    inputDescricao: document.getElementById('input-descricao'),
    inputValor: document.getElementById('input-valor'),
    inputData: document.getElementById('input-data'),
    selectCategoria: document.getElementById('select-categoria'),
    feedbackFormulario: document.getElementById('form-feedback'),

    // Nova categoria inline
    boxNovaCategoria: document.getElementById('box-nova-categoria'),
    inputNovaCategoria: document.getElementById('input-nova-categoria'),
    radiosTipoNovaCategoria: document.querySelectorAll('input[name="tipo-nova-categoria"]'),
    btnConfirmarCategoria: document.getElementById('btn-confirmar-categoria'),
    btnCancelarCategoria: document.getElementById('btn-cancelar-categoria'),

    // Gerenciar / excluir categorias inline
    btnGerenciarCategorias: document.getElementById('btn-gerenciar-categorias'),
    boxGerenciarCategorias: document.getElementById('box-gerenciar-categorias'),
    tituloGerenciarCategorias: document.getElementById('titulo-gerenciar-categorias'),
    btnNovaPeloGerenciar: document.getElementById('btn-nova-pelo-gerenciar'),
    listaGerenciarCategorias: document.getElementById('lista-gerenciar-categorias'),
    btnFecharGerenciar: document.getElementById('btn-fechar-gerenciar'),

    // Histórico
    contadorHistorico: document.getElementById('contador-historico'),
    historicoVazio: document.getElementById('historico-vazio'),
    listaHistorico: document.getElementById('lista-historico'),

    // Modal de Vidro Fosco
    modalBackdrop: document.getElementById('modal-movimentacao'),
    btnFecharModal: document.getElementById('btn-fechar-modal'),
    formEditar: document.getElementById('form-editar-movimentacao'),
    radiosEditarTipo: document.querySelectorAll('input[name="editar-tipo"]'),
    editarDescricao: document.getElementById('editar-descricao'),
    editarValor: document.getElementById('editar-valor'),
    editarData: document.getElementById('editar-data'),
    editarCategoria: document.getElementById('editar-categoria'),
    modalFeedback: document.getElementById('modal-feedback'),
    modalAcoesPadrao: document.getElementById('modal-acoes-padrao'),
    btnSolicitarExclusao: document.getElementById('btn-solicitar-exclusao'),
    modalConfirmacao: document.getElementById('modal-confirmacao'),
    modalConfirmacaoTexto: document.getElementById('modal-confirmacao-texto'),
    btnCancelarConfirmacao: document.getElementById('btn-cancelar-confirmacao'),
    btnConfirmarAcao: document.getElementById('btn-confirmar-acao'),

    // Dashboard Analítico
    badgePeriodoDashboard: document.getElementById('badge-periodo-dashboard'),
    kpiTaxaEconomia: document.getElementById('kpi-taxa-economia'),
    kpiStatusEconomia: document.getElementById('kpi-status-economia'),
    kpiComprometimento: document.getElementById('kpi-comprometimento'),
    barraComprometimento: document.getElementById('barra-comprometimento'),
    kpiMaiorCategoria: document.getElementById('kpi-maior-categoria'),
    kpiMaiorCategoriaDetalhe: document.getElementById('kpi-maior-categoria-detalhe'),
    kpiTicketMedio: document.getElementById('kpi-ticket-medio'),
    kpiTicketDetalhe: document.getElementById('kpi-ticket-detalhe'),

    graficoDonutVazio: document.getElementById('grafico-donut-vazio'),
    graficoDonutConteudo: document.getElementById('grafico-donut-conteudo'),
    svgDonutCategorias: document.getElementById('svg-donut-categorias'),
    legendaDonutCategorias: document.getElementById('legenda-donut-categorias'),
    donutCentroTitulo: document.getElementById('donut-centro-titulo'),
    donutCentroValor: document.getElementById('donut-centro-valor'),
    donutCentroPercentual: document.getElementById('donut-centro-percentual'),

    graficoMensalVazio: document.getElementById('grafico-mensal-vazio'),
    graficoMensalConteudo: document.getElementById('grafico-mensal-conteudo'),
    svgFluxoMensal: document.getElementById('svg-fluxo-mensal'),
    resumoHoverMensal: document.getElementById('resumo-hover-mensal'),

    tabRankDespesas: document.getElementById('tab-rank-despesas'),
    tabRankReceitas: document.getElementById('tab-rank-receitas'),
    rankingVazio: document.getElementById('ranking-vazio'),
    listaRankingCategorias: document.getElementById('lista-ranking-categorias'),

    // Modal Separado: Conta, Histórico e Reset
    modalPerfil: document.getElementById('modal-perfil'),
    btnFecharPerfil: document.getElementById('btn-fechar-perfil'),
    formEditarPerfil: document.getElementById('form-editar-perfil'),
    inputEditarNome: document.getElementById('input-editar-nome'),
    selectMesApagar: document.getElementById('select-mes-apagar'),
    btnApagarMes: document.getElementById('btn-apagar-mes'),
    btnApagarTodoHistorico: document.getElementById('btn-apagar-todo-historico'),
    btnResetarConta: document.getElementById('btn-resetar-conta'),
    perfilFeedback: document.getElementById('perfil-feedback'),
    perfilAcoesPadrao: document.getElementById('perfil-acoes-padrao'),
    perfilConfirmacao: document.getElementById('perfil-confirmacao'),
    perfilConfirmacaoTexto: document.getElementById('perfil-confirmacao-texto'),
    btnCancelarPerfilConfirmacao: document.getElementById('btn-cancelar-perfil-confirmacao'),
    btnConfirmarPerfil: document.getElementById('btn-confirmar-perfil'),

    // Telas de Cumprimento (1) e Boas-Vindas (2)
    telaAcesso: document.getElementById('tela-acesso'),
    palcoTelasIniciais: document.getElementById('palco-telas-iniciais'),
    visaoCumprimento: document.getElementById('visao-cumprimento'),
    formCumprimento: document.getElementById('form-cumprimento'),
    inputNomeUsuario: document.getElementById('input-nome-usuario'),
    acessoFeedback: document.getElementById('acesso-feedback'),

    visaoBoasVindas: document.getElementById('visao-boas-vindas'),
    tituloBoasVindas: document.getElementById('titulo-boas-vindas'),
    btnAcessarSistema: document.getElementById('btn-acessar-sistema'),
};

/* ================================
    FEEDBACK DO FORMULÁRIO E MODAL
   ================================ */

let temporizadorFeedback = null;

function exibirFeedbackFormulario(mensagem, tipo = 'success') {
    clearTimeout(temporizadorFeedback);
    elementos.feedbackFormulario.textContent = mensagem;
    elementos.feedbackFormulario.classList.remove('is-error', 'is-success', 'is-popping');

    if (mensagem) {
        void elementos.feedbackFormulario.offsetWidth;
        elementos.feedbackFormulario.classList.add(
            tipo === 'error' ? 'is-error' : 'is-success',
            'is-popping'
        );
        temporizadorFeedback = setTimeout(() => {
            elementos.feedbackFormulario.textContent = '';
            elementos.feedbackFormulario.classList.remove('is-error', 'is-success', 'is-popping');
        }, 4000);
    }
}

function dispararAnimacaoNoElemento(elemento, classeAnimacao) {
    if (!elemento) {
        return;
    }
    elemento.classList.remove(classeAnimacao);
    void elemento.offsetWidth;
    elemento.classList.add(classeAnimacao);
}

function animarPaineisAposNovaMovimentacao(tipo) {
    // Sempre destaca o Saldo Atual + o painel correspondente (Receitas ou Despesas)
    dispararAnimacaoNoElemento(elementos.cardSaldo, 'is-pulsing');
    dispararAnimacaoNoElemento(elementos.valorSaldo, 'is-updated');

    if (tipo === 'income') {
        dispararAnimacaoNoElemento(elementos.cardReceitas, 'is-pulsing');
        dispararAnimacaoNoElemento(elementos.valorReceitas, 'is-updated');
    } else {
        dispararAnimacaoNoElemento(elementos.cardDespesas, 'is-pulsing');
        dispararAnimacaoNoElemento(elementos.valorDespesas, 'is-updated');
    }
}

function exibirFeedbackModal(mensagem = '', tipo = 'error') {
    elementos.modalFeedback.textContent = mensagem;
    elementos.modalFeedback.classList.remove('is-error', 'is-success');

    if (mensagem) {
        elementos.modalFeedback.classList.add(tipo === 'error' ? 'is-error' : 'is-success');
    }
}

/* ================================
    RENDERIZAÇÃO: HEADER E PAINÉIS
   ================================ */

function renderizarFiltroDeMeses() {
    const mesesDisponiveis = extrairMesesComMovimentacoes(estadoDaAplicacao.movimentacoes);
    elementos.filtroMes.innerHTML = '';

    if (mesesDisponiveis.length === 0) {
        const opcaoVazia = document.createElement('option');
        opcaoVazia.value = '';
        opcaoVazia.textContent = 'Sem movimentações';
        elementos.filtroMes.appendChild(opcaoVazia);
        elementos.filtroMes.disabled = true;
        return;
    }

    elementos.filtroMes.disabled = false;

    const opcaoTodos = document.createElement('option');
    opcaoTodos.value = 'all';
    opcaoTodos.textContent = 'Todos os períodos';
    elementos.filtroMes.appendChild(opcaoTodos);

    mesesDisponiveis.forEach((anoMes) => {
        const opcao = document.createElement('option');
        opcao.value = anoMes;
        opcao.textContent = formatarNomeDoMes(anoMes);
        elementos.filtroMes.appendChild(opcao);
    });

    const mesAindaExiste =
        estadoDaAplicacao.mesSelecionado === 'all' ||
        mesesDisponiveis.includes(estadoDaAplicacao.mesSelecionado);

    estadoDaAplicacao.mesSelecionado = mesAindaExiste ? estadoDaAplicacao.mesSelecionado : 'all';
    elementos.filtroMes.value = estadoDaAplicacao.mesSelecionado;
}

function renderizarPaineisDeResumo() {
    const movimentacoesDoPeriodo = filtrarMovimentacoesPorMes(
        estadoDaAplicacao.movimentacoes,
        estadoDaAplicacao.mesSelecionado
    );

    const resumo = calcularSaldoEntradasESaidas(movimentacoesDoPeriodo);

    elementos.valorSaldo.textContent = formatarValorEmReais(resumo.saldoAtual);
    elementos.valorReceitas.textContent = formatarValorEmReais(resumo.totalReceitas);
    elementos.valorDespesas.textContent = formatarValorEmReais(resumo.totalDespesas);

    elementos.valorSaldo.classList.toggle('is-negative', resumo.saldoAtual < 0);

    if (movimentacoesDoPeriodo.length === 0) {
        elementos.infoSaldo.textContent = 'Nenhuma movimentação no período';
    } else if (estadoDaAplicacao.mesSelecionado === 'all') {
        elementos.infoSaldo.textContent = 'Consolidado de todos os períodos';
    } else {
        elementos.infoSaldo.textContent = `Resumo de ${formatarNomeDoMes(estadoDaAplicacao.mesSelecionado)}`;
    }

    elementos.infoReceitas.textContent =
        resumo.quantidadeReceitas === 1
            ? '1 entrada registrada'
            : `${resumo.quantidadeReceitas} entradas registradas`;

    elementos.infoDespesas.textContent =
        resumo.quantidadeDespesas === 1
            ? '1 saída registrada'
            : `${resumo.quantidadeDespesas} saídas registradas`;
}

/* ================================
    RENDERIZAÇÃO: HISTÓRICO
   ================================ */

function criarElementoSVGSeguro(tag, atributos = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(atributos).forEach(([chave, valor]) => {
        el.setAttribute(chave, String(valor));
    });
    return el;
}

function criarIconeTipoMovimentacao(tipo) {
    const wrapper = document.createElement('div');
    wrapper.className = `history-icon ${tipo === 'income' ? 'is-income' : 'is-expense'}`;
    wrapper.setAttribute('aria-hidden', 'true');

    const svg = criarElementoSVGSeguro('svg', {
        width: 18,
        height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2.2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
    });

    // Seta para cima = Receita | Seta para baixo = Despesa
    if (tipo === 'income') {
        svg.append(
            criarElementoSVGSeguro('path', { d: 'M12 19V5' }),
            criarElementoSVGSeguro('path', { d: 'M5 12l7-7 7 7' })
        );
    } else {
        svg.append(
            criarElementoSVGSeguro('path', { d: 'M12 5v14' }),
            criarElementoSVGSeguro('path', { d: 'M19 12l-7 7-7-7' })
        );
    }

    wrapper.appendChild(svg);
    return wrapper;
}

function renderizarHistoricoDeMovimentacoes() {
    const movimentacoesDoPeriodo = filtrarMovimentacoesPorMes(
        estadoDaAplicacao.movimentacoes,
        estadoDaAplicacao.mesSelecionado
    );

    const ordenadas = ordenarMovimentacoesPorDataMaisRecente(movimentacoesDoPeriodo);

    elementos.contadorHistorico.textContent =
        ordenadas.length === 1
            ? '1 registro no período'
            : `${ordenadas.length} registros no período`;

    elementos.listaHistorico.innerHTML = '';
    elementos.historicoVazio.hidden = ordenadas.length > 0;

    ordenadas.forEach((movimentacao) => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.id = movimentacao.id;

        if (movimentacao.id === estadoDaAplicacao.ultimaMovimentacaoAdicionadaId) {
            li.classList.add(
                'is-just-added',
                movimentacao.type === 'income' ? 'is-income' : 'is-expense'
            );
        } else if (movimentacao.id === estadoDaAplicacao.ultimaMovimentacaoEditadaId) {
            li.classList.add('is-just-edited');
        }

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'history-item-btn';
        botao.addEventListener('click', () => abrirModalDaMovimentacao(movimentacao.id));

        const icone = criarIconeTipoMovimentacao(movimentacao.type);

        const info = document.createElement('div');
        info.className = 'history-info';

        const descricao = document.createElement('span');
        descricao.className = 'history-description';
        descricao.textContent = movimentacao.description;

        const meta = document.createElement('div');
        meta.className = 'history-meta';

        const categoriaTag = document.createElement('span');
        categoriaTag.className = 'history-category-tag';
        categoriaTag.textContent = movimentacao.category;

        const dataSpan = document.createElement('span');
        dataSpan.className = 'history-date';
        dataSpan.textContent = formatarDataCurtaBR(movimentacao.date);

        meta.append(categoriaTag, dataSpan);
        info.append(descricao, meta);

        const valor = document.createElement('strong');
        const ehReceita = movimentacao.type === 'income';
        valor.className = `history-amount ${ehReceita ? 'is-income' : 'is-expense'}`;
        const sinal = ehReceita ? '+' : '-';
        valor.textContent = `${sinal} ${formatarValorEmReais(movimentacao.amount)}`;

        botao.append(icone, info, valor);
        li.appendChild(botao);
        elementos.listaHistorico.appendChild(li);
    });

    estadoDaAplicacao.ultimaMovimentacaoAdicionadaId = null;
    estadoDaAplicacao.ultimaMovimentacaoEditadaId = null;
}

/* ================================
    RENDERIZAÇÃO: CATEGORIAS
   ================================ */

function renderizarSeletorDeCategorias(categoriaParaSelecionar = null) {
    const categoriasDoTipo = filtrarCategoriasPorTipo(
        estadoDaAplicacao.categorias,
        estadoDaAplicacao.tipoFormularioAtivo
    );

    const valorAnterior = elementos.selectCategoria.value;
    elementos.selectCategoria.innerHTML = '';

    categoriasDoTipo.forEach((categoria) => {
        const opcao = document.createElement('option');
        opcao.value = categoria.name;
        opcao.textContent = categoria.name;
        elementos.selectCategoria.appendChild(opcao);
    });

    const opcaoNova = document.createElement('option');
    opcaoNova.value = VALOR_OPCAO_NOVA_CATEGORIA;
    opcaoNova.textContent = '+ Adicionar nova categoria...';
    elementos.selectCategoria.appendChild(opcaoNova);

    const alvo = categoriaParaSelecionar || valorAnterior;
    const existeNaLista = categoriasDoTipo.some((cat) => cat.name === alvo);

    if (existeNaLista) {
        elementos.selectCategoria.value = alvo;
    } else if (categoriasDoTipo.length > 0) {
        elementos.selectCategoria.value = categoriasDoTipo[0].name;
    }
}

function renderizarSeletorDeCategoriasDoModal(tipo, categoriaSelecionada = null) {
    const categoriasDoTipo = filtrarCategoriasPorTipo(estadoDaAplicacao.categorias, tipo);
    elementos.editarCategoria.innerHTML = '';

    categoriasDoTipo.forEach((categoria) => {
        const opcao = document.createElement('option');
        opcao.value = categoria.name;
        opcao.textContent = categoria.name;
        elementos.editarCategoria.appendChild(opcao);
    });

    // Preserva a categoria antiga caso o usuário tenha excluído ela depois do lançamento
    if (categoriaSelecionada && !categoriasDoTipo.some((cat) => cat.name === categoriaSelecionada)) {
        const opcaoLegada = document.createElement('option');
        opcaoLegada.value = categoriaSelecionada;
        opcaoLegada.textContent = `${categoriaSelecionada} (arquivada)`;
        elementos.editarCategoria.appendChild(opcaoLegada);
    }

    if (categoriaSelecionada) {
        elementos.editarCategoria.value = categoriaSelecionada;
    } else if (categoriasDoTipo.length > 0) {
        elementos.editarCategoria.value = categoriasDoTipo[0].name;
    }
}

function renderizarListaGerenciarCategorias() {
    const tipoAtual = estadoDaAplicacao.tipoFormularioAtivo;
    const categoriasDoTipo = filtrarCategoriasPorTipo(estadoDaAplicacao.categorias, tipoAtual);
    const rotuloTipo = tipoAtual === 'expense' ? 'Despesa' : 'Receita';

    elementos.tituloGerenciarCategorias.textContent = `Categorias de ${rotuloTipo} (${categoriasDoTipo.length})`;
    elementos.listaGerenciarCategorias.innerHTML = '';

    const podeExcluir = categoriasDoTipo.length > 1;

    categoriasDoTipo.forEach((categoria) => {
        const item = document.createElement('li');
        item.className = 'category-manage-item';

        const nomeSpan = document.createElement('span');
        nomeSpan.textContent = categoria.name;
        item.appendChild(nomeSpan);

        if (estadoDaAplicacao.categoriaPendenteExclusaoId === categoria.id) {
            const grupoConfirmacao = document.createElement('div');
            grupoConfirmacao.className = 'category-confirm-group';

            const btnSim = document.createElement('button');
            btnSim.type = 'button';
            btnSim.className = 'category-confirm-yes';
            btnSim.textContent = 'Confirmar';
            btnSim.addEventListener('click', () => confirmarExclusaoDeCategoria(categoria.id));

            const btnNao = document.createElement('button');
            btnNao.type = 'button';
            btnNao.className = 'category-confirm-no';
            btnNao.textContent = 'Cancelar';
            btnNao.addEventListener('click', () => {
                estadoDaAplicacao.categoriaPendenteExclusaoId = null;
                renderizarListaGerenciarCategorias();
            });

            grupoConfirmacao.append(btnSim, btnNao);
            item.appendChild(grupoConfirmacao);
        } else {
            const btnExcluir = document.createElement('button');
            btnExcluir.type = 'button';
            btnExcluir.className = 'category-delete-btn';
            btnExcluir.textContent = 'Excluir';
            btnExcluir.disabled = !podeExcluir;
            btnExcluir.title = podeExcluir
                ? `Excluir categoria ${categoria.name}`
                : 'Mantenha ao menos uma categoria';

            btnExcluir.addEventListener('click', () => {
                estadoDaAplicacao.categoriaPendenteExclusaoId = categoria.id;
                renderizarListaGerenciarCategorias();
            });

            item.appendChild(btnExcluir);
        }

        elementos.listaGerenciarCategorias.appendChild(item);
    });
}

/* ================================
    AÇÕES DE CATEGORIAS
   ================================ */

function abrirPainelNovaCategoria({ manterGerenciarAberto = false } = {}) {
    if (!manterGerenciarAberto) {
        elementos.boxGerenciarCategorias.hidden = true;
    }

    elementos.boxNovaCategoria.hidden = false;
    elementos.inputNovaCategoria.value = '';

    elementos.radiosTipoNovaCategoria.forEach((radio) => {
        radio.checked = radio.value === estadoDaAplicacao.tipoFormularioAtivo;
    });

    elementos.inputNovaCategoria.focus();
}

function fecharPainelNovaCategoria() {
    elementos.boxNovaCategoria.hidden = true;
    elementos.inputNovaCategoria.value = '';

    if (elementos.selectCategoria.value === VALOR_OPCAO_NOVA_CATEGORIA) {
        renderizarSeletorDeCategorias();
    }
}

function salvarCategoriaCriadaPeloUsuario() {
    const nome = elementos.inputNovaCategoria.value;
    const radioMarcado = document.querySelector('input[name="tipo-nova-categoria"]:checked');
    const tipoEscolhido = radioMarcado ? radioMarcado.value : estadoDaAplicacao.tipoFormularioAtivo;

    const resultado = adicionarNovaCategoria(estadoDaAplicacao.categorias, nome, tipoEscolhido);

    if (!resultado.sucesso) {
        exibirFeedbackFormulario(resultado.erro, 'error');
        elementos.inputNovaCategoria.focus();
        return;
    }

    estadoDaAplicacao.categorias = resultado.categoriasAtualizadas;
    salvarCategoriasLocais(estadoDaAplicacao.categorias);

    estadoDaAplicacao.tipoFormularioAtivo = tipoEscolhido;
    elementos.radiosTipo.forEach((radio) => {
        radio.checked = radio.value === tipoEscolhido;
    });

    fecharPainelNovaCategoria();
    renderizarSeletorDeCategorias(resultado.categoriaCriada.name);

    if (!elementos.boxGerenciarCategorias.hidden) {
        renderizarListaGerenciarCategorias();
    }

    exibirFeedbackFormulario(`Categoria "${resultado.categoriaCriada.name}" adicionada!`, 'success');
}

function confirmarExclusaoDeCategoria(idCategoria) {
    const resultado = excluirCategoriaPorId(estadoDaAplicacao.categorias, idCategoria);

    if (!resultado.sucesso) {
        exibirFeedbackFormulario(resultado.erro, 'error');
        return;
    }

    estadoDaAplicacao.categorias = resultado.categoriasAtualizadas;
    estadoDaAplicacao.categoriaPendenteExclusaoId = null;
    salvarCategoriasLocais(estadoDaAplicacao.categorias);

    renderizarSeletorDeCategorias();
    renderizarListaGerenciarCategorias();
    exibirFeedbackFormulario(`Categoria "${resultado.categoriaRemovida.name}" excluída.`, 'success');
}

/* ================================
    AÇÕES DO MODAL DE VIDRO FOSCO
   ================================ */

function resetarConfirmacaoDoModal() {
    estadoDaAplicacao.acaoPendenteNoModal = null;
    estadoDaAplicacao.dadosPendentesParaEdicao = null;
    elementos.modalConfirmacao.hidden = true;
    elementos.modalConfirmacao.classList.remove('is-danger');
    elementos.modalAcoesPadrao.hidden = false;
}

let temporizadorFecharModal = null;

function abrirModalDaMovimentacao(idMovimentacao) {
    const movimentacao = estadoDaAplicacao.movimentacoes.find((item) => item.id === idMovimentacao);
    if (!movimentacao) {
        return;
    }

    clearTimeout(temporizadorFecharModal);
    elementos.modalBackdrop.classList.remove('is-leaving');

    estadoDaAplicacao.movimentacaoAbertaNoModalId = movimentacao.id;
    resetarConfirmacaoDoModal();
    exibirFeedbackModal('');

    // Preenche os campos do modal com os dados da movimentação clicada
    elementos.radiosEditarTipo.forEach((radio) => {
        radio.checked = radio.value === movimentacao.type;
    });
    elementos.editarDescricao.value = movimentacao.description;
    elementos.editarValor.value = formatarValorEmReais(movimentacao.amount);
    elementos.editarData.value = movimentacao.date;
    renderizarSeletorDeCategoriasDoModal(movimentacao.type, movimentacao.category);

    elementos.modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    elementos.editarDescricao.focus();
}

function fecharModalDaMovimentacao() {
    clearTimeout(temporizadorFecharModal);
    estadoDaAplicacao.movimentacaoAbertaNoModalId = null;
    resetarConfirmacaoDoModal();
    exibirFeedbackModal('');
    document.body.style.overflow = '';

    if (elementos.modalBackdrop.hidden) {
        return;
    }

    elementos.modalBackdrop.classList.add('is-leaving');
    temporizadorFecharModal = setTimeout(() => {
        elementos.modalBackdrop.hidden = true;
        elementos.modalBackdrop.classList.remove('is-leaving');
    }, 240);
}

function obterTipoMarcadoNoModal() {
    const radioMarcado = document.querySelector('input[name="editar-tipo"]:checked');
    return radioMarcado ? radioMarcado.value : 'expense';
}

function solicitarConfirmacaoDeEdicao(evento) {
    evento.preventDefault();
    exibirFeedbackModal('');

    const dadosEditados = {
        tipo: obterTipoMarcadoNoModal(),
        descricao: elementos.editarDescricao.value,
        valor: elementos.editarValor.value,
        data: elementos.editarData.value,
        categoria: elementos.editarCategoria.value,
    };

    // Valida antes mesmo de pedir confirmação
    const validacao = validarDadosDaMovimentacao(dadosEditados);
    if (!validacao.valido) {
        exibirFeedbackModal(validacao.erro, 'error');
        return;
    }

    estadoDaAplicacao.acaoPendenteNoModal = 'edit';
    estadoDaAplicacao.dadosPendentesParaEdicao = dadosEditados;

    elementos.modalAcoesPadrao.hidden = true;
    elementos.modalConfirmacao.classList.remove('is-danger');
    elementos.modalConfirmacaoTexto.textContent =
        'Confirma salvar as alterações feitas nesta movimentação?';
    elementos.btnConfirmarAcao.className = 'btn-primary';
    elementos.btnConfirmarAcao.textContent = 'Confirmar edição';
    elementos.modalConfirmacao.hidden = false;
}

function solicitarConfirmacaoDeExclusao() {
    exibirFeedbackModal('');
    estadoDaAplicacao.acaoPendenteNoModal = 'delete';
    estadoDaAplicacao.dadosPendentesParaEdicao = null;

    elementos.modalAcoesPadrao.hidden = true;
    elementos.modalConfirmacao.classList.add('is-danger');
    elementos.modalConfirmacaoTexto.textContent =
        'Tem certeza que deseja excluir esta movimentação? Essa ação não pode ser desfeita.';
    elementos.btnConfirmarAcao.className = 'btn-danger-solid';
    elementos.btnConfirmarAcao.textContent = 'Confirmar exclusão';
    elementos.modalConfirmacao.hidden = false;
}

function executarAcaoConfirmadaNoModal() {
    const id = estadoDaAplicacao.movimentacaoAbertaNoModalId;

    if (estadoDaAplicacao.acaoPendenteNoModal === 'edit') {
        const resultado = atualizarMovimentacaoPorId(
            estadoDaAplicacao.movimentacoes,
            id,
            estadoDaAplicacao.dadosPendentesParaEdicao
        );

        if (!resultado.sucesso) {
            exibirFeedbackModal(resultado.erro, 'error');
            resetarConfirmacaoDoModal();
            return;
        }

        estadoDaAplicacao.movimentacoes = resultado.movimentacoesAtualizadas;
        salvarMovimentacoesLocais(estadoDaAplicacao.movimentacoes);
        fecharModalDaMovimentacao();

        // Aguarda o vidro fosco abrir para o usuário ver o destaque azul no item editado
        setTimeout(() => {
            estadoDaAplicacao.ultimaMovimentacaoEditadaId = id;
            atualizarInterfaceCompleta();
            animarPaineisAposNovaMovimentacao(resultado.movimentacaoAtualizada.type);
            exibirFeedbackFormulario('Movimentação atualizada com sucesso!', 'success');
        }, 180);
        return;
    }

    if (estadoDaAplicacao.acaoPendenteNoModal === 'delete') {
        const resultado = excluirMovimentacaoPorId(estadoDaAplicacao.movimentacoes, id);

        if (!resultado.sucesso) {
            exibirFeedbackModal(resultado.erro, 'error');
            resetarConfirmacaoDoModal();
            return;
        }

        const tipoRemovido = resultado.movimentacaoRemovida.type;
        estadoDaAplicacao.movimentacoes = resultado.movimentacoesAtualizadas;
        salvarMovimentacoesLocais(estadoDaAplicacao.movimentacoes);
        fecharModalDaMovimentacao();

        const itemNoDOM = elementos.listaHistorico.querySelector(
            `.history-item[data-id="${CSS.escape(id)}"]`
        );

        const concluirExclusaoVisual = () => {
            atualizarInterfaceCompleta();
            animarPaineisAposNovaMovimentacao(tipoRemovido);
            exibirFeedbackFormulario('Movimentação excluída do histórico.', 'success');
        };

        if (itemNoDOM) {
            // Aguarda o modal sair um pouco para você acompanhar o item deslizando para fora
            setTimeout(() => {
                itemNoDOM.classList.add('is-removing');
                setTimeout(concluirExclusaoVisual, 390);
            }, 180);
        } else {
            concluirExclusaoVisual();
        }
    }
}

/* ================================
    AÇÕES DO FORMULÁRIO PRINCIPAL
   ================================ */

function registrarMovimentacaoDoFormulario(evento) {
    evento.preventDefault();

    const resultado = criarNovaMovimentacao({
        tipo: estadoDaAplicacao.tipoFormularioAtivo,
        descricao: elementos.inputDescricao.value,
        valor: elementos.inputValor.value,
        data: elementos.inputData.value,
        categoria: elementos.selectCategoria.value,
    });

    if (!resultado.sucesso) {
        exibirFeedbackFormulario(resultado.erro, 'error');
        return;
    }

    estadoDaAplicacao.movimentacoes = [resultado.movimentacao, ...estadoDaAplicacao.movimentacoes];
    estadoDaAplicacao.ultimaMovimentacaoAdicionadaId = resultado.movimentacao.id;
    salvarMovimentacoesLocais(estadoDaAplicacao.movimentacoes);

    elementos.inputDescricao.value = '';
    elementos.inputValor.value = '';
    elementos.inputDescricao.focus();

    atualizarInterfaceCompleta();
    animarPaineisAposNovaMovimentacao(resultado.movimentacao.type);
    exibirFeedbackFormulario('Movimentação registrada com sucesso!', 'success');
}

/* ================================
   RENDERIZAÇÃO: DASHBOARD ANALÍTICO
   ================================ */

function renderizarRankingDeCategorias(movimentacoesDoPeriodo) {
    const tipo = estadoDaAplicacao.abaRankingAtiva;
    const grupos = agruparMovimentacoesPorCategoria(movimentacoesDoPeriodo, tipo);

    elementos.tabRankDespesas.classList.toggle('is-active', tipo === 'expense');
    elementos.tabRankDespesas.setAttribute('aria-selected', String(tipo === 'expense'));
    elementos.tabRankReceitas.classList.toggle('is-active', tipo === 'income');
    elementos.tabRankReceitas.setAttribute('aria-selected', String(tipo === 'income'));

    elementos.listaRankingCategorias.innerHTML = '';
    elementos.rankingVazio.hidden = grupos.length > 0;

    grupos.forEach((grupo, indice) => {
        const cor = tipo === 'expense' ? obterCorDaCategoria(indice) : '#10b981';

        const li = document.createElement('li');
        li.className = 'ranking-item';

        const topo = document.createElement('div');
        topo.className = 'ranking-item-top';

        const titulo = document.createElement('div');
        titulo.className = 'ranking-item-title';

        const bolinha = document.createElement('span');
        bolinha.className = 'donut-swatch';
        bolinha.style.backgroundColor = cor;

        const nome = document.createElement('span');
        nome.className = 'ranking-item-name';
        nome.textContent = grupo.categoria;

        const contagem = document.createElement('span');
        contagem.className = 'ranking-item-count';
        contagem.textContent =
            grupo.quantidade === 1 ? '1 lançamento' : `${grupo.quantidade} lançamentos`;

        titulo.append(bolinha, nome, contagem);

        const valores = document.createElement('div');
        valores.className = 'ranking-item-values';

        const valor = document.createElement('strong');
        valor.className = 'ranking-item-amount';
        valor.textContent = formatarValorEmReais(grupo.total);

        const percentual = document.createElement('span');
        percentual.className = 'ranking-item-percent';
        percentual.textContent = `${grupo.percentual.toFixed(1).replace('.', ',')}%`;

        valores.append(valor, percentual);
        topo.append(titulo, valores);

        const trilha = document.createElement('div');
        trilha.className = 'ranking-bar-track';

        const preenchimento = document.createElement('div');
        preenchimento.className = 'ranking-bar-fill';
        preenchimento.style.width = `${Math.min(grupo.percentual, 100)}%`;
        preenchimento.style.backgroundColor = cor;

        trilha.appendChild(preenchimento);
        li.append(topo, trilha);
        elementos.listaRankingCategorias.appendChild(li);
    });
}

function renderizarDashboardAnalitico() {
    const movimentacoesDoPeriodo = filtrarMovimentacoesPorMes(
        estadoDaAplicacao.movimentacoes,
        estadoDaAplicacao.mesSelecionado
    );

    elementos.badgePeriodoDashboard.textContent =
        estadoDaAplicacao.mesSelecionado === 'all'
            ? 'Todos os períodos'
            : formatarNomeDoMes(estadoDaAplicacao.mesSelecionado);

    // 1. Indicadores Inteligentes (KPIs)
    const indicadores = calcularIndicadoresDoDashboard(movimentacoesDoPeriodo);

    if (indicadores.taxaDeEconomia === null) {
        elementos.kpiTaxaEconomia.textContent = '—';
    } else {
        elementos.kpiTaxaEconomia.textContent = `${indicadores.taxaDeEconomia.toFixed(1).replace('.', ',')}%`;
    }

    elementos.kpiStatusEconomia.textContent = indicadores.rotuloStatusEconomia;
    elementos.kpiStatusEconomia.className = 'kpi-status';
    if (indicadores.statusEconomia !== 'neutral') {
        elementos.kpiStatusEconomia.classList.add(`is-${indicadores.statusEconomia}`);
    }

    const comprometidoFormatado = Math.min(indicadores.percentualComprometido, 999);
    elementos.kpiComprometimento.textContent = `${comprometidoFormatado.toFixed(1).replace('.', ',')}%`;
    elementos.barraComprometimento.style.width = `${Math.min(indicadores.percentualComprometido, 100)}%`;
    elementos.barraComprometimento.className = 'kpi-progress-fill';
    if (indicadores.percentualComprometido >= 90) {
        elementos.barraComprometimento.classList.add('is-danger');
    } else if (indicadores.percentualComprometido >= 70) {
        elementos.barraComprometimento.classList.add('is-warning');
    }

    if (indicadores.maiorCategoriaDeGasto) {
        elementos.kpiMaiorCategoria.textContent = indicadores.maiorCategoriaDeGasto.categoria;
        elementos.kpiMaiorCategoriaDetalhe.textContent = `${formatarValorEmReais(indicadores.maiorCategoriaDeGasto.total)} (${indicadores.maiorCategoriaDeGasto.percentual.toFixed(1).replace('.', ',')}% das saídas)`;
    } else {
        elementos.kpiMaiorCategoria.textContent = '—';
        elementos.kpiMaiorCategoriaDetalhe.textContent = 'Nenhuma despesa no período';
    }

    elementos.kpiTicketMedio.textContent = formatarValorEmReais(indicadores.ticketMedioDespesas);
    elementos.kpiTicketDetalhe.textContent =
        indicadores.resumo.quantidadeDespesas > 0
            ? `Baseado em ${indicadores.resumo.quantidadeDespesas} saída(s)`
            : 'Valor médio por saída';

    // 2. Gráfico Donut (Despesas por categoria do período selecionado)
    const temDespesas = indicadores.despesasPorCategoria.length > 0;
    elementos.graficoDonutVazio.hidden = temDespesas;
    elementos.graficoDonutConteudo.hidden = !temDespesas;

    if (temDespesas) {
        renderizarGraficoDonutDeCategorias({
            svgEl: elementos.svgDonutCategorias,
            legendaEl: elementos.legendaDonutCategorias,
            centroTituloEl: elementos.donutCentroTitulo,
            centroValorEl: elementos.donutCentroValor,
            centroPercentualEl: elementos.donutCentroPercentual,
            categoriasAgrupadas: indicadores.despesasPorCategoria,
            totalGeral: indicadores.resumo.totalDespesas,
            formatarMoeda: formatarValorEmReais,
        });
    }

    // 3. Gráfico de Barras Mensais (comparativo de todos os meses com movimentação)
    const seriesMensais = agruparFluxoMensalDeReceitasEDespesas(estadoDaAplicacao.movimentacoes, 6);
    const temFluxoMensal = seriesMensais.length > 0;
    elementos.graficoMensalVazio.hidden = temFluxoMensal;
    elementos.graficoMensalConteudo.hidden = !temFluxoMensal;

    if (temFluxoMensal) {
        renderizarGraficoBarrasMensais({
            svgEl: elementos.svgFluxoMensal,
            resumoHoverEl: elementos.resumoHoverMensal,
            seriesMensais,
            mesSelecionado: estadoDaAplicacao.mesSelecionado,
            formatarMoeda: formatarValorEmReais,
            aoClicarNoMes: (anoMesClicado) => {
                estadoDaAplicacao.mesSelecionado =
                    estadoDaAplicacao.mesSelecionado === anoMesClicado ? 'all' : anoMesClicado;
                elementos.filtroMes.value = estadoDaAplicacao.mesSelecionado;
                atualizarSecoesFiltraveis();
            },
        });
    }

    // 4. Ranking detalhado por categoria
    renderizarRankingDeCategorias(movimentacoesDoPeriodo);
}

/* ================================
    ORQUESTRAÇÃO E EVENTOS
   ================================ */

function atualizarSecoesFiltraveis() {
    renderizarPaineisDeResumo();
    renderizarHistoricoDeMovimentacoes();
    renderizarDashboardAnalitico();
}

function atualizarInterfaceCompleta() {
    renderizarFiltroDeMeses();
    atualizarSecoesFiltraveis();
}

// Troca de mês no header
elementos.filtroMes.addEventListener('change', (evento) => {
    estadoDaAplicacao.mesSelecionado = evento.target.value;
    atualizarSecoesFiltraveis();
});

// Troca entre Despesa e Receita no formulário principal
elementos.radiosTipo.forEach((radio) => {
    radio.addEventListener('change', (evento) => {
        estadoDaAplicacao.tipoFormularioAtivo = evento.target.value;
        estadoDaAplicacao.categoriaPendenteExclusaoId = null;
        renderizarSeletorDeCategorias();

        if (!elementos.boxGerenciarCategorias.hidden) {
            renderizarListaGerenciarCategorias();
        }
    });
});

// Seletor de categoria -> detecta "+ Adicionar nova categoria..."
elementos.selectCategoria.addEventListener('change', (evento) => {
    if (evento.target.value === VALOR_OPCAO_NOVA_CATEGORIA) {
        abrirPainelNovaCategoria();
    } else {
        fecharPainelNovaCategoria();
    }
});

// Botões do painel de nova categoria
elementos.btnConfirmarCategoria.addEventListener('click', salvarCategoriaCriadaPeloUsuario);
elementos.btnCancelarCategoria.addEventListener('click', fecharPainelNovaCategoria);
elementos.inputNovaCategoria.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        salvarCategoriaCriadaPeloUsuario();
    }
});

// Botões do painel de gerenciar / excluir categorias
elementos.btnGerenciarCategorias.addEventListener('click', () => {
    const vaiAbrir = elementos.boxGerenciarCategorias.hidden;
    fecharPainelNovaCategoria();
    estadoDaAplicacao.categoriaPendenteExclusaoId = null;
    elementos.boxGerenciarCategorias.hidden = !vaiAbrir;

    if (vaiAbrir) {
        renderizarListaGerenciarCategorias();
    }
});

elementos.btnNovaPeloGerenciar.addEventListener('click', () => {
    abrirPainelNovaCategoria({ manterGerenciarAberto: true });
});

elementos.btnFecharGerenciar.addEventListener('click', () => {
    elementos.boxGerenciarCategorias.hidden = true;
    estadoDaAplicacao.categoriaPendenteExclusaoId = null;
});

// Máscara monetária em tempo real (R$ 0,00) nos campos de valor
function aplicarMascaraMonetariaNoCampo(evento) {
    evento.target.value = formatarEntradaMonetariaBRL(evento.target.value);
}

elementos.inputValor.addEventListener('input', aplicarMascaraMonetariaNoCampo);
elementos.editarValor.addEventListener('input', aplicarMascaraMonetariaNoCampo);

// Envio do formulário principal
elementos.formulario.addEventListener('submit', registrarMovimentacaoDoFormulario);

// Eventos do Modal de Vidro Fosco
elementos.btnFecharModal.addEventListener('click', fecharModalDaMovimentacao);

elementos.modalBackdrop.addEventListener('click', (evento) => {
    if (evento.target === elementos.modalBackdrop) {
        fecharModalDaMovimentacao();
    }
});

document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') {
        return;
    }

    if (!elementos.modalBackdrop.hidden) {
        fecharModalDaMovimentacao();
    } else if (!elementos.modalPerfil.hidden) {
        fecharModalPerfil();
    }
});

elementos.radiosEditarTipo.forEach((radio) => {
    radio.addEventListener('change', (evento) => {
        renderizarSeletorDeCategoriasDoModal(evento.target.value);
        resetarConfirmacaoDoModal();
    });
});

elementos.formEditar.addEventListener('submit', solicitarConfirmacaoDeEdicao);
elementos.btnSolicitarExclusao.addEventListener('click', solicitarConfirmacaoDeExclusao);
elementos.btnCancelarConfirmacao.addEventListener('click', resetarConfirmacaoDoModal);
elementos.btnConfirmarAcao.addEventListener('click', executarAcaoConfirmadaNoModal);

// Abas do Ranking por categoria no Dashboard
elementos.tabRankDespesas.addEventListener('click', () => {
    estadoDaAplicacao.abaRankingAtiva = 'expense';
    renderizarDashboardAnalitico();
});

elementos.tabRankReceitas.addEventListener('click', () => {
    estadoDaAplicacao.abaRankingAtiva = 'income';
    renderizarDashboardAnalitico();
});

/* ================================
   TELAS DE CUMPRIMENTO E BOAS-VINDAS
   ================================ */

function exibirFeedbackAcesso(elementoAlvo, mensagem = '', tipo = 'error') {
    elementoAlvo.textContent = mensagem;
    elementoAlvo.classList.remove('is-error', 'is-success');

    if (mensagem) {
        elementoAlvo.classList.add(tipo === 'error' ? 'is-error' : 'is-success');
    }
}

function atualizarCabecalhoDePerfil() {
    const perfil = estadoDaAplicacao.perfilDeAcesso;

    if (perfil && perfil.nome) {
        elementos.saudacaoUsuario.textContent = `Olá, ${perfil.nome} — Controle financeiro`;
    } else {
        elementos.saudacaoUsuario.textContent = 'Controle financeiro inteligente';
    }
}

let temporizadorSaidaOverlay = null;
let observadorRevelacaoScroll = null;

function obterBlocosParaRevelacaoSequencial() {
    return Array.from(
        document.querySelectorAll(
            '.app-header, .summary-card, .form-section, .history-section, .dashboard-header, .kpi-card, .chart-card, .ranking-card'
        )
    );
}

function prepararBlocosParaRevelacao() {
    if (observadorRevelacaoScroll) {
        observadorRevelacaoScroll.disconnect();
        observadorRevelacaoScroll = null;
    }

    obterBlocosParaRevelacaoSequencial().forEach((el) => {
        el.classList.remove('is-visible');
        el.style.transitionDelay = '';
        el.classList.add('reveal-item');
    });
}

function iniciarRevelacaoPorEtapasEScroll() {
    const blocos = obterBlocosParaRevelacaoSequencial();
    const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefereMenosMovimento || typeof IntersectionObserver === 'undefined') {
        blocos.forEach((el) => {
            el.classList.remove('reveal-item', 'is-visible');
            el.style.transitionDelay = '';
        });
        return;
    }

    if (observadorRevelacaoScroll) {
        observadorRevelacaoScroll.disconnect();
    }

    // Mapeia a ordem visual na página para revelar cada lote sempre de cima para baixo
    const indicePorElemento = new Map(blocos.map((el, idx) => [el, idx]));

    observadorRevelacaoScroll = new IntersectionObserver(
        (entradas, observer) => {
            const visiveisAgora = entradas
                .filter((entrada) => entrada.isIntersecting)
                .map((entrada) => entrada.target)
                .sort((a, b) => (indicePorElemento.get(a) ?? 0) - (indicePorElemento.get(b) ?? 0));

            visiveisAgora.forEach((el, posicaoNoLote) => {
                const atrasoMs = posicaoNoLote * 140;
                el.style.transitionDelay = `${atrasoMs}ms`;
                el.classList.add('is-visible');
                observer.unobserve(el);

                // Após concluir a entrada, limpa classes/delay para o hover funcionar instantaneamente
                setTimeout(() => {
                    el.style.transitionDelay = '';
                    el.classList.remove('reveal-item', 'is-visible');
                }, atrasoMs + 780);
            });
        },
        {
            threshold: 0.12,
            rootMargin: '0px 0px -30px 0px',
        }
    );

    blocos.forEach((el) => observadorRevelacaoScroll.observe(el));
}

function reproduzirStaggerNaVisao(blocoEl) {
    blocoEl.classList.remove('is-hiding', 'is-shown');
    void blocoEl.offsetHeight;
    blocoEl.classList.add('is-shown');
}

function definirPaginaInicial(numeroPagina, { animarSlide = false } = {}) {
    elementos.palcoTelasIniciais.classList.remove('is-settled');

    if (!animarSlide) {
        elementos.palcoTelasIniciais.style.setProperty('--page-exit-enabled', '0');
    }

    elementos.palcoTelasIniciais.setAttribute('data-page', String(numeroPagina));

    // Mantém o foco de teclado apenas na tela ativa
    const pagina1Ativa = numeroPagina === 1;
    elementos.visaoCumprimento.inert = !pagina1Ativa;
    elementos.visaoBoasVindas.inert = pagina1Ativa;

    if (!animarSlide) {
        if (!pagina1Ativa) {
            elementos.palcoTelasIniciais.classList.add('is-settled');
        }
        void elementos.palcoTelasIniciais.offsetWidth;
        elementos.palcoTelasIniciais.style.removeProperty('--page-exit-enabled');
    }

    const visaoAtiva = pagina1Ativa ? elementos.visaoCumprimento : elementos.visaoBoasVindas;
    const visaoInativa = pagina1Ativa ? elementos.visaoBoasVindas : elementos.visaoCumprimento;
    visaoInativa.classList.remove('is-shown');
    reproduzirStaggerNaVisao(visaoAtiva);
}

// Tela 1: Cumprimento (1º acesso — sistema se apresenta e pede nome ou apelido)
function abrirTelaCumprimento() {
    clearTimeout(temporizadorSaidaOverlay);
    elementos.telaAcesso.classList.remove('is-leaving');
    prepararBlocosParaRevelacao();

    exibirFeedbackAcesso(elementos.acessoFeedback, '');
    elementos.inputNomeUsuario.value = '';
    elementos.telaAcesso.hidden = false;
    document.body.style.overflow = 'hidden';

    definirPaginaInicial(1, { animarSlide: false });
    elementos.inputNomeUsuario.focus();
}

// Tela 2: Boas-vindas (após avançar e em todos os próximos acessos)
function abrirTelaBoasVindas({ vindoDoCumprimento = false } = {}) {
    clearTimeout(temporizadorSaidaOverlay);
    elementos.telaAcesso.classList.remove('is-leaving');

    if (!vindoDoCumprimento) {
        prepararBlocosParaRevelacao();
    }

    const perfil = estadoDaAplicacao.perfilDeAcesso;
    const nome = perfil && perfil.nome ? perfil.nome : '';

    if (nome) {
        const destaqueNome = document.createElement('span');
        destaqueNome.className = 'brand-highlight';
        destaqueNome.textContent = nome;
        elementos.tituloBoasVindas.replaceChildren(
            document.createTextNode('Seja Bem-Vindo(a), '),
            destaqueNome,
            document.createTextNode('!')
        );
    } else {
        elementos.tituloBoasVindas.textContent = 'Seja Bem-Vindo(a)!';
    }

    elementos.telaAcesso.hidden = false;
    document.body.style.overflow = 'hidden';

    definirPaginaInicial(2, { animarSlide: vindoDoCumprimento });
}

function fecharTelaAcessoComTransicao() {
    clearTimeout(temporizadorSaidaOverlay);

    elementos.telaAcesso.classList.add('is-leaving');
    document.body.style.overflow = '';

    temporizadorSaidaOverlay = setTimeout(() => {
        elementos.telaAcesso.hidden = true;
        elementos.telaAcesso.classList.remove('is-leaving');
    }, 260);
}

function avancarParaBoasVindas(evento) {
    evento.preventDefault();
    exibirFeedbackAcesso(elementos.acessoFeedback, '');

    const validacaoNome = validarNomeDoUsuario(elementos.inputNomeUsuario.value);
    if (!validacaoNome.valido) {
        exibirFeedbackAcesso(elementos.acessoFeedback, validacaoNome.erro, 'error');
        elementos.inputNomeUsuario.focus();
        return;
    }

    const novoPerfil = {
        nome: validacaoNome.nomeFormatado,
        atualizadoEm: new Date().toISOString(),
    };

    salvarPerfilDeAcessoLocal(novoPerfil);
    estadoDaAplicacao.perfilDeAcesso = novoPerfil;
    atualizarCabecalhoDePerfil();

    // Desliza suavemente da Tela 1 (Cumprimento) para a Tela 2 (Boas-vindas)
    abrirTelaBoasVindas({ vindoDoCumprimento: true });
}

function acessarSistemaPrincipal() {
    // Inicia saída da tela de boas-vindas e liga o observador de etapas + scroll
    requestAnimationFrame(() => {
        fecharTelaAcessoComTransicao();
        iniciarRevelacaoPorEtapasEScroll();
    });
}

/* --- Modal Separado: Conta, Limpeza de Histórico e Reset --- */

function renderizarSeletorMesesParaApagar() {
    const mesesDisponiveis = extrairMesesComMovimentacoes(estadoDaAplicacao.movimentacoes);
    elementos.selectMesApagar.innerHTML = '';

    if (mesesDisponiveis.length === 0) {
        const opcaoVazia = document.createElement('option');
        opcaoVazia.value = '';
        opcaoVazia.textContent = 'Sem movimentações no histórico';
        elementos.selectMesApagar.appendChild(opcaoVazia);
        elementos.selectMesApagar.disabled = true;
        elementos.btnApagarMes.disabled = true;
        elementos.btnApagarTodoHistorico.disabled = true;
        return;
    }

    elementos.selectMesApagar.disabled = false;
    elementos.btnApagarMes.disabled = false;
    elementos.btnApagarTodoHistorico.disabled = false;

    mesesDisponiveis.forEach((anoMes) => {
        const quantidade = filtrarMovimentacoesPorMes(estadoDaAplicacao.movimentacoes, anoMes).length;
        const opcao = document.createElement('option');
        opcao.value = anoMes;
        opcao.textContent = `${formatarNomeDoMes(anoMes)} (${quantidade})`;
        elementos.selectMesApagar.appendChild(opcao);
    });
}

function resetarConfirmacaoPerfil() {
    estadoDaAplicacao.acaoPendenteConta = null;
    elementos.perfilConfirmacao.hidden = true;
    elementos.perfilConfirmacao.classList.remove('is-danger');
    elementos.perfilAcoesPadrao.hidden = false;
}

function abrirConfirmacaoDeAcaoDaConta({ tipo, payload = null, texto, perigosa = false, textoBotao = 'Confirmar' }) {
    estadoDaAplicacao.acaoPendenteConta = { tipo, payload };
    elementos.perfilConfirmacaoTexto.textContent = texto;
    elementos.perfilConfirmacao.classList.toggle('is-danger', perigosa);
    elementos.btnConfirmarPerfil.className = perigosa ? 'btn-danger-solid' : 'btn-primary';
    elementos.btnConfirmarPerfil.textContent = textoBotao;
    elementos.perfilAcoesPadrao.hidden = true;
    elementos.perfilConfirmacao.hidden = false;
}

let temporizadorFecharModalPerfil = null;

function abrirModalPerfil() {
    if (!elementos.telaAcesso.hidden) {
        return;
    }

    clearTimeout(temporizadorFecharModalPerfil);
    elementos.modalPerfil.classList.remove('is-leaving');

    const perfil = estadoDaAplicacao.perfilDeAcesso;
    resetarConfirmacaoPerfil();
    exibirFeedbackAcesso(elementos.perfilFeedback, '');

    elementos.inputEditarNome.value = perfil ? perfil.nome || '' : '';
    renderizarSeletorMesesParaApagar();

    elementos.modalPerfil.hidden = false;
    document.body.style.overflow = 'hidden';
}

function fecharModalPerfil({ imediato = false } = {}) {
    clearTimeout(temporizadorFecharModalPerfil);
    resetarConfirmacaoPerfil();
    exibirFeedbackAcesso(elementos.perfilFeedback, '');

    if (elementos.modalPerfil.hidden) {
        return;
    }

    if (imediato) {
        elementos.modalPerfil.hidden = true;
        elementos.modalPerfil.classList.remove('is-leaving');
        return;
    }

    document.body.style.overflow = '';
    elementos.modalPerfil.classList.add('is-leaving');
    temporizadorFecharModalPerfil = setTimeout(() => {
        elementos.modalPerfil.hidden = true;
        elementos.modalPerfil.classList.remove('is-leaving');
    }, 240);
}

function solicitarConfirmacaoAlteracaoNome(evento) {
    evento.preventDefault();
    exibirFeedbackAcesso(elementos.perfilFeedback, '');

    const validacaoNome = validarNomeDoUsuario(elementos.inputEditarNome.value);
    if (!validacaoNome.valido) {
        exibirFeedbackAcesso(elementos.perfilFeedback, validacaoNome.erro, 'error');
        elementos.inputEditarNome.focus();
        return;
    }

    abrirConfirmacaoDeAcaoDaConta({
        tipo: 'rename',
        payload: validacaoNome.nomeFormatado,
        texto: `Confirma alterar seu nome para "${validacaoNome.nomeFormatado}"?`,
        perigosa: false,
        textoBotao: 'Confirmar nome',
    });
}

function solicitarConfirmacaoApagarMes() {
    exibirFeedbackAcesso(elementos.perfilFeedback, '');
    const anoMes = elementos.selectMesApagar.value;

    if (!anoMes) {
        exibirFeedbackAcesso(elementos.perfilFeedback, 'Não há meses disponíveis para apagar.', 'error');
        return;
    }

    const quantidade = filtrarMovimentacoesPorMes(estadoDaAplicacao.movimentacoes, anoMes).length;
    const nomeMes = formatarNomeDoMes(anoMes);

    abrirConfirmacaoDeAcaoDaConta({
        tipo: 'delete-month',
        payload: anoMes,
        texto: `Tem certeza que deseja apagar ${quantidade === 1 ? '1 movimentação' : `todas as ${quantidade} movimentações`} de ${nomeMes}? Essa ação não pode ser desfeita.`,
        perigosa: true,
        textoBotao: 'Apagar mês',
    });
}

function solicitarConfirmacaoApagarTodoHistorico() {
    exibirFeedbackAcesso(elementos.perfilFeedback, '');
    const total = estadoDaAplicacao.movimentacoes.length;

    if (total === 0) {
        exibirFeedbackAcesso(elementos.perfilFeedback, 'O histórico já está vazio.', 'error');
        return;
    }

    abrirConfirmacaoDeAcaoDaConta({
        tipo: 'delete-all-history',
        texto: `Tem certeza que deseja apagar TODO o histórico (${total === 1 ? '1 movimentação' : `${total} movimentações`})? Seu nome e suas categorias serão mantidos, mas os lançamentos não poderão ser recuperados.`,
        perigosa: true,
        textoBotao: 'Apagar histórico',
    });
}

function solicitarConfirmacaoResetConta() {
    exibirFeedbackAcesso(elementos.perfilFeedback, '');

    abrirConfirmacaoDeAcaoDaConta({
        tipo: 'reset-account',
        texto: 'ATENÇÃO: Resetar a conta apagará permanentemente seu nome, todo o histórico de movimentações e todas as categorias personalizadas. Deseja realmente recomeçar do zero?',
        perigosa: true,
        textoBotao: 'Resetar tudo',
    });
}

function executarAcaoConfirmadaDaConta() {
    const acao = estadoDaAplicacao.acaoPendenteConta;
    if (!acao) {
        return;
    }

    if (acao.tipo === 'rename') {
        const perfilAtualizado = {
            nome: acao.payload,
            atualizadoEm: new Date().toISOString(),
        };

        const salvou = salvarPerfilDeAcessoLocal(perfilAtualizado);
        if (!salvou) {
            exibirFeedbackAcesso(
                elementos.perfilFeedback,
                'Não foi possível gravar no armazenamento local deste navegador.',
                'error'
            );
            resetarConfirmacaoPerfil();
            return;
        }

        estadoDaAplicacao.perfilDeAcesso = perfilAtualizado;
        atualizarCabecalhoDePerfil();
        fecharModalPerfil();
        exibirFeedbackFormulario('Nome atualizado com sucesso!', 'success');
        return;
    }

    if (acao.tipo === 'delete-month') {
        const resultado = excluirMovimentacoesPorMes(estadoDaAplicacao.movimentacoes, acao.payload);
        if (!resultado.sucesso) {
            exibirFeedbackAcesso(elementos.perfilFeedback, resultado.erro, 'error');
            resetarConfirmacaoPerfil();
            return;
        }

        estadoDaAplicacao.movimentacoes = resultado.movimentacoesAtualizadas;
        salvarMovimentacoesLocais(estadoDaAplicacao.movimentacoes);
        atualizarInterfaceCompleta();
        fecharModalPerfil();
        exibirFeedbackFormulario(
            `Histórico de ${formatarNomeDoMes(acao.payload)} apagado (${resultado.quantidadeRemovida} registro(s)).`,
            'success'
        );
        return;
    }

    if (acao.tipo === 'delete-all-history') {
        const resultado = limparTodoHistoricoDeMovimentacoes(estadoDaAplicacao.movimentacoes);
        if (!resultado.sucesso) {
            exibirFeedbackAcesso(elementos.perfilFeedback, resultado.erro, 'error');
            resetarConfirmacaoPerfil();
            return;
        }

        estadoDaAplicacao.movimentacoes = resultado.movimentacoesAtualizadas;
        estadoDaAplicacao.mesSelecionado = 'all';
        salvarMovimentacoesLocais(estadoDaAplicacao.movimentacoes);
        atualizarInterfaceCompleta();
        fecharModalPerfil();
        exibirFeedbackFormulario('Todo o histórico de movimentações foi apagado.', 'success');
        return;
    }

    if (acao.tipo === 'reset-account') {
        resetarTodosOsDadosLocais();

        // Reseta completamente o estado em memória e volta para a Tela 1 (Cumprimento)
        estadoDaAplicacao.movimentacoes = [];
        estadoDaAplicacao.categorias = obterCategoriasPadrao();
        salvarCategoriasLocais(estadoDaAplicacao.categorias);
        estadoDaAplicacao.perfilDeAcesso = null;
        estadoDaAplicacao.mesSelecionado = 'all';
        estadoDaAplicacao.tipoFormularioAtivo = 'expense';
        estadoDaAplicacao.categoriaPendenteExclusaoId = null;

        elementos.radiosTipo.forEach((radio) => {
            radio.checked = radio.value === 'expense';
        });
        elementos.boxNovaCategoria.hidden = true;
        elementos.boxGerenciarCategorias.hidden = true;

        fecharModalPerfil({ imediato: true });
        renderizarSeletorDeCategorias();
        atualizarInterfaceCompleta();
        atualizarCabecalhoDePerfil();
        abrirTelaCumprimento();
    }
}

// Eventos das Telas de Cumprimento e Boas-Vindas
elementos.formCumprimento.addEventListener('submit', avancarParaBoasVindas);
elementos.btnAcessarSistema.addEventListener('click', acessarSistemaPrincipal);

// Eventos do Modal Separado: Conta, Histórico e Reset
elementos.btnEditarPerfil.addEventListener('click', abrirModalPerfil);
elementos.btnFecharPerfil.addEventListener('click', () => fecharModalPerfil());

elementos.modalPerfil.addEventListener('click', (evento) => {
    if (evento.target === elementos.modalPerfil) {
        fecharModalPerfil();
    }
});

elementos.formEditarPerfil.addEventListener('submit', solicitarConfirmacaoAlteracaoNome);
elementos.btnApagarMes.addEventListener('click', solicitarConfirmacaoApagarMes);
elementos.btnApagarTodoHistorico.addEventListener('click', solicitarConfirmacaoApagarTodoHistorico);
elementos.btnResetarConta.addEventListener('click', solicitarConfirmacaoResetConta);
elementos.btnCancelarPerfilConfirmacao.addEventListener('click', resetarConfirmacaoPerfil);
elementos.btnConfirmarPerfil.addEventListener('click', executarAcaoConfirmadaDaConta);

/* ================================
   PWA: SERVICE WORKER E INSTALAÇÃO
   ================================ */

let eventoInstalacaoPendente = null;

function registrarServiceWorkerPWA() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./sw.js', { scope: './' })
            .catch((erro) => console.error('Falha ao registrar Service Worker:', erro));
    });
}

window.addEventListener('beforeinstallprompt', (evento) => {
    // Impede o mini-banner automático do navegador para usar nosso botão próprio "Instalar"
    evento.preventDefault();
    eventoInstalacaoPendente = evento;
    elementos.btnInstalarApp.hidden = false;
});

elementos.btnInstalarApp.addEventListener('click', async () => {
    if (!eventoInstalacaoPendente) {
        return;
    }

    eventoInstalacaoPendente.prompt();
    const { outcome } = await eventoInstalacaoPendente.userChoice;
    eventoInstalacaoPendente = null;

    if (outcome === 'accepted') {
        elementos.btnInstalarApp.hidden = true;
    }
});

window.addEventListener('appinstalled', () => {
    eventoInstalacaoPendente = null;
    elementos.btnInstalarApp.hidden = true;
    exibirFeedbackFormulario('FinPulse instalado no seu dispositivo!', 'success');
});

// Inicialização: pré-renderiza a interface atrás da tela inicial para 0ms de delay ao clicar em "Acessar sistema"
function iniciarAplicacao() {
    registrarServiceWorkerPWA();
    estadoDaAplicacao.perfilDeAcesso = carregarPerfilDeAcessoLocal();
    const perfil = estadoDaAplicacao.perfilDeAcesso;

    elementos.inputData.value = obterDataDeHojeISO();
    renderizarSeletorDeCategorias();
    atualizarInterfaceCompleta();
    atualizarCabecalhoDePerfil();

    if (perfil && perfil.nome) {
        // Já tem nome salvo -> vai direto para a Tela de Boas-Vindas ("Acessar sistema")
        abrirTelaBoasVindas();
    } else {
        // 1º acesso -> mostra a Tela de Cumprimento ("Olá, sou FinPulse...")
        abrirTelaCumprimento();
    }
}

iniciarAplicacao();
