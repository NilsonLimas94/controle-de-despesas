/**
 * CAMADA DE DOMÍNIO (REGRAS DE NEGÓCIO PURAS)
 * -------------------------------------------
 * Todas as funções aqui são 100% internas e puras:
 * - Não acessam o DOM (HTML/CSS)
 * - Não dependem de variáveis globais externas
 * - Recebem os dados por parâmetro e devolvem o resultado
 */

/* ================================
   UTILITÁRIOS INTERNOS DE DOMÍNIO
   ================================ */

const VALOR_MAXIMO_MOVIMENTACAO = 999999999.99;
const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function gerarIdUnico() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback criptográfico caso executado fora de contexto seguro (ex.: IP local HTTP)
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function dataISOEhValida(dataISO) {
    if (typeof dataISO !== 'string' || !REGEX_DATA_ISO.test(dataISO)) {
        return false;
    }

    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

/* ================================
   PERFIL DE ACESSO
   ================================ */

export function validarNomeDoUsuario(nomeBruto) {
    const nomeLimpo = String(nomeBruto || '').trim().replace(/\s+/g, ' ');

    if (nomeLimpo.length < 2) {
        return { valido: false, erro: 'Informe seu nome (mínimo de 2 letras).' };
    }

    if (nomeLimpo.length > 40) {
        return { valido: false, erro: 'O nome pode ter no máximo 40 caracteres.' };
    }

    return {
        valido: true,
        nomeFormatado: nomeLimpo,
    };
}

/* ================================
   CATEGORIAS
   ================================ */

export function obterCategoriasPadrao() {
    return [
        // Despesas (saídas)
        { id: 'cat-exp-alimentacao', name: 'Alimentação', type: 'expense' },
        { id: 'cat-exp-moradia', name: 'Moradia', type: 'expense' },
        { id: 'cat-exp-contas', name: 'Contas', type: 'expense' },
        { id: 'cat-exp-transporte', name: 'Transporte', type: 'expense' },
        { id: 'cat-exp-saude', name: 'Saúde', type: 'expense' },
        { id: 'cat-exp-lazer', name: 'Lazer e Passeios', type: 'expense' },
        { id: 'cat-exp-educacao', name: 'Educação', type: 'expense' },
        { id: 'cat-exp-compras', name: 'Compras', type: 'expense' },
        { id: 'cat-exp-outras', name: 'Outras despesas', type: 'expense' },

        // Receitas (entradas)
        { id: 'cat-inc-salario', name: 'Salário', type: 'income' },
        { id: 'cat-inc-renda-extra', name: 'Renda Extra', type: 'income' },
        { id: 'cat-inc-freelance', name: 'Freelance', type: 'income' },
        { id: 'cat-inc-investimentos', name: 'Investimentos', type: 'income' },
        { id: 'cat-inc-reembolso', name: 'Reembolso', type: 'income' },
        { id: 'cat-inc-outras', name: 'Outras receitas', type: 'income' },
    ];
}

export function filtrarCategoriasPorTipo(categorias, tipo) {
    return categorias.filter((categoria) => categoria.type === tipo);
}

export function adicionarNovaCategoria(categoriasExistentes, nomeBruto, tipo) {
    const nomeLimpo = String(nomeBruto || '').trim();

    if (!nomeLimpo) {
        return { sucesso: false, erro: 'Digite um nome para a nova categoria.' };
    }

    if (nomeLimpo.length > 32) {
        return { sucesso: false, erro: 'O nome da categoria pode ter no máximo 32 caracteres.' };
    }

    if (tipo !== 'expense' && tipo !== 'income') {
        return { sucesso: false, erro: 'Escolha se a categoria é Despesa ou Receita.' };
    }

    const jaExiste = categoriasExistentes.some(
        (cat) => cat.type === tipo && cat.name.toLowerCase() === nomeLimpo.toLowerCase()
    );

    if (jaExiste) {
        return { sucesso: false, erro: 'Já existe uma categoria com esse nome para esse tipo.' };
    }

    const categoriaCriada = {
        id: gerarIdUnico(),
        name: nomeLimpo,
        type: tipo,
    };

    return {
        sucesso: true,
        categoriaCriada,
        categoriasAtualizadas: [...categoriasExistentes, categoriaCriada],
    };
}

export function excluirCategoriaPorId(categoriasExistentes, idCategoria) {
    const categoriaAlvo = categoriasExistentes.find((cat) => cat.id === idCategoria);

    if (!categoriaAlvo) {
        return { sucesso: false, erro: 'Categoria não encontrada.' };
    }

    const totalDoMesmoTipo = categoriasExistentes.filter(
        (cat) => cat.type === categoriaAlvo.type
    ).length;

    if (totalDoMesmoTipo <= 1) {
        return {
            sucesso: false,
            erro: 'É necessário manter ao menos uma categoria disponível para esse tipo.',
        };
    }

    return {
        sucesso: true,
        categoriaRemovida: categoriaAlvo,
        categoriasAtualizadas: categoriasExistentes.filter((cat) => cat.id !== idCategoria),
    };
}

/* ================================
    MOVIMENTAÇÕES E CÁLCULOS
   ================================ */

export function validarDadosDaMovimentacao({ tipo, descricao, valor, data, categoria }) {
    const descricaoLimpa = String(descricao || '').trim();
    const valorNumerico =
        typeof valor === 'number' ? valor : converterTextoMonetarioParaNumero(valor);

    if (tipo !== 'expense' && tipo !== 'income') {
        return { valido: false, erro: 'Tipo de movimentação inválido.' };
    }

    if (!descricaoLimpa) {
        return { valido: false, erro: 'Informe uma descrição para a movimentação.' };
    }

    if (descricaoLimpa.length > 80) {
        return { valido: false, erro: 'A descrição pode ter no máximo 80 caracteres.' };
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
        return { valido: false, erro: 'Informe um valor maior que zero.' };
    }

    if (valorNumerico > VALOR_MAXIMO_MOVIMENTACAO) {
        return { valido: false, erro: 'O valor informado excede o limite permitido.' };
    }

    if (!dataISOEhValida(data)) {
        return { valido: false, erro: 'Selecione uma data válida para a movimentação.' };
    }

    const categoriaLimpa = String(categoria || '').trim();
    if (!categoriaLimpa || categoriaLimpa === '__nova_categoria__' || categoriaLimpa.length > 40) {
        return { valido: false, erro: 'Selecione uma categoria válida.' };
    }

    return {
        valido: true,
        dadosNormalizados: {
            type: tipo,
            description: descricaoLimpa,
            amount: Math.round(valorNumerico * 100) / 100,
            date: data,
            category: categoriaLimpa,
        },
    };
}

export function criarNovaMovimentacao(dadosFormulario) {
    const validacao = validarDadosDaMovimentacao(dadosFormulario);

    if (!validacao.valido) {
        return { sucesso: false, erro: validacao.erro };
    }

    const movimentacao = {
        id: gerarIdUnico(),
        ...validacao.dadosNormalizados,
        createdAt: new Date().toISOString(),
    };

    return { sucesso: true, movimentacao };
}

export function atualizarMovimentacaoPorId(movimentacoesExistentes, idMovimentacao, novosDados) {
    const existe = movimentacoesExistentes.some((item) => item.id === idMovimentacao);

    if (!existe) {
        return { sucesso: false, erro: 'Movimentação não encontrada.' };
    }

    const validacao = validarDadosDaMovimentacao(novosDados);

    if (!validacao.valido) {
        return { sucesso: false, erro: validacao.erro };
    }

    let movimentacaoAtualizada = null;

    const movimentacoesAtualizadas = movimentacoesExistentes.map((item) => {
        if (item.id !== idMovimentacao) {
            return item;
        }

        movimentacaoAtualizada = {
            ...item,
            ...validacao.dadosNormalizados,
            updatedAt: new Date().toISOString(),
        };

        return movimentacaoAtualizada;
    });

    return {
        sucesso: true,
        movimentacaoAtualizada,
        movimentacoesAtualizadas,
    };
}

export function excluirMovimentacaoPorId(movimentacoesExistentes, idMovimentacao) {
    const movimentacaoRemovida = movimentacoesExistentes.find((item) => item.id === idMovimentacao);

    if (!movimentacaoRemovida) {
        return { sucesso: false, erro: 'Movimentação não encontrada.' };
    }

    return {
        sucesso: true,
        movimentacaoRemovida,
        movimentacoesAtualizadas: movimentacoesExistentes.filter((item) => item.id !== idMovimentacao),
    };
}

export function excluirMovimentacoesPorMes(movimentacoesExistentes, anoMes) {
    if (!anoMes) {
        return { sucesso: false, erro: 'Selecione um mês válido para apagar.' };
    }

    const movimentacoesAtualizadas = movimentacoesExistentes.filter(
        (item) => !(item.date && item.date.startsWith(anoMes))
    );

    const quantidadeRemovida = movimentacoesExistentes.length - movimentacoesAtualizadas.length;

    if (quantidadeRemovida === 0) {
        return { sucesso: false, erro: 'Nenhuma movimentação encontrada nesse mês.' };
    }

    return {
        sucesso: true,
        quantidadeRemovida,
        movimentacoesAtualizadas,
    };
}

export function limparTodoHistoricoDeMovimentacoes(movimentacoesExistentes) {
    const quantidadeRemovida = movimentacoesExistentes.length;

    if (quantidadeRemovida === 0) {
        return { sucesso: false, erro: 'O histórico já está vazio.' };
    }

    return {
        sucesso: true,
        quantidadeRemovida,
        movimentacoesAtualizadas: [],
    };
}

export function ordenarMovimentacoesPorDataMaisRecente(movimentacoes) {
    return [...movimentacoes].sort((itemA, itemB) => {
        const comparacaoData = (itemB.date || '').localeCompare(itemA.date || '');
        if (comparacaoData !== 0) {
            return comparacaoData;
        }
        return (itemB.createdAt || '').localeCompare(itemA.createdAt || '');
    });
}

export function extrairMesesComMovimentacoes(movimentacoes) {
    const mesesUnicos = new Set();

    movimentacoes.forEach((movimentacao) => {
        if (movimentacao.date && movimentacao.date.length >= 7) {
            mesesUnicos.add(movimentacao.date.slice(0, 7)); // Ex: "2026-06-15" -> "2026-06"
        }
    });

    // Ordena do mês mais recente para o mais antigo
    return Array.from(mesesUnicos).sort((mesA, mesB) => mesB.localeCompare(mesA));
}

export function filtrarMovimentacoesPorMes(movimentacoes, mesSelecionado) {
    if (!mesSelecionado || mesSelecionado === 'all') {
        return movimentacoes;
    }

    return movimentacoes.filter((movimentacao) => {
        return movimentacao.date && movimentacao.date.startsWith(mesSelecionado);
    });
}

export function calcularSaldoEntradasESaidas(movimentacoes) {
    return movimentacoes.reduce(
        (resumo, movimentacao) => {
            const valor = Number(movimentacao.amount) || 0;

            if (movimentacao.type === 'income') {
                resumo.totalReceitas += valor;
                resumo.quantidadeReceitas += 1;
            } else if (movimentacao.type === 'expense') {
                resumo.totalDespesas += valor;
                resumo.quantidadeDespesas += 1;
            }

            resumo.saldoAtual = resumo.totalReceitas - resumo.totalDespesas;
            return resumo;
        },
        {
            saldoAtual: 0,
            totalReceitas: 0,
            totalDespesas: 0,
            quantidadeReceitas: 0,
            quantidadeDespesas: 0,
        }
    );
}

/* ================================
    FORMATAÇÃO E DATAS
   ================================ */

export function formatarValorEmReais(valorNumerico) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valorNumerico);
}

export function converterTextoMonetarioParaNumero(textoDigitado) {
    const apenasDigitos = String(textoDigitado || '').replace(/\D/g, '');
    if (!apenasDigitos) {
        return 0;
    }
    return Number(apenasDigitos) / 100;
}

export function formatarEntradaMonetariaBRL(textoDigitado) {
    const valorNumerico = converterTextoMonetarioParaNumero(textoDigitado);
    if (valorNumerico <= 0) {
        return '';
    }
    return formatarValorEmReais(valorNumerico);
}

export function formatarNomeDoMes(anoMes) {
    const [ano, mes] = anoMes.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);

    const textoFormatado = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
    }).format(data);

    return textoFormatado.charAt(0).toUpperCase() + textoFormatado.slice(1);
}

export function obterDataDeHojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function formatarDataCurtaBR(dataISO) {
    if (!dataISO || !dataISO.includes('-')) {
        return '';
    }
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

export function formatarRotuloCurtoDoMes(anoMes) {
    const [ano, mes] = anoMes.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(data)
        .replace('.', '');
    const mesCapitalizado = mesCurto.charAt(0).toUpperCase() + mesCurto.slice(1);
    return `${mesCapitalizado}/${String(ano).slice(-2)}`;
}

/* ================================
   ANÁLISES DO DASHBOARD (PURAS)
   ================================ */

export function agruparMovimentacoesPorCategoria(movimentacoes, tipo) {
    const mapa = new Map();
    let totalGeral = 0;

    movimentacoes.forEach((item) => {
        if (item.type !== tipo) {
            return;
        }

        const valor = Number(item.amount) || 0;
        const nomeCategoria = item.category || 'Sem categoria';
        totalGeral += valor;

        const atual = mapa.get(nomeCategoria) || {
            categoria: nomeCategoria,
            total: 0,
            quantidade: 0,
        };

        atual.total += valor;
        atual.quantidade += 1;
        mapa.set(nomeCategoria, atual);
    });

    return Array.from(mapa.values())
        .map((grupo) => ({
            ...grupo,
            total: Math.round(grupo.total * 100) / 100,
            percentual: totalGeral > 0 ? (grupo.total / totalGeral) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
}

export function calcularIndicadoresDoDashboard(movimentacoes) {
    const resumo = calcularSaldoEntradasESaidas(movimentacoes);
    const despesasPorCategoria = agruparMovimentacoesPorCategoria(movimentacoes, 'expense');

    // Taxa de economia e comprometimento da renda
    let taxaDeEconomia = null;
    let statusEconomia = 'neutral';
    let rotuloStatusEconomia = 'Adicione receitas para calcular';
    let percentualComprometido = 0;

    if (resumo.totalReceitas > 0) {
        taxaDeEconomia = ((resumo.totalReceitas - resumo.totalDespesas) / resumo.totalReceitas) * 100;
        percentualComprometido = (resumo.totalDespesas / resumo.totalReceitas) * 100;

        if (taxaDeEconomia >= 20) {
            statusEconomia = 'healthy';
            rotuloStatusEconomia = 'Ritmo de economia saudável';
        } else if (taxaDeEconomia >= 0) {
            statusEconomia = 'warning';
            rotuloStatusEconomia = 'Margem apertada no período';
        } else {
            statusEconomia = 'danger';
            rotuloStatusEconomia = 'Despesas superaram receitas';
        }
    } else if (resumo.totalDespesas > 0) {
        statusEconomia = 'danger';
        rotuloStatusEconomia = 'Apenas saídas no período';
        percentualComprometido = 100;
    }

    const maiorCategoriaDeGasto = despesasPorCategoria.length > 0 ? despesasPorCategoria[0] : null;
    const ticketMedioDespesas =
        resumo.quantidadeDespesas > 0 ? resumo.totalDespesas / resumo.quantidadeDespesas : 0;

    return {
        resumo,
        despesasPorCategoria,
        taxaDeEconomia,
        statusEconomia,
        rotuloStatusEconomia,
        percentualComprometido,
        maiorCategoriaDeGasto,
        ticketMedioDespesas,
    };
}

export function agruparFluxoMensalDeReceitasEDespesas(movimentacoes, limiteDeMeses = 6) {
    const mapaMensal = new Map();

    movimentacoes.forEach((item) => {
        if (!item.date || item.date.length < 7) {
            return;
        }

        const anoMes = item.date.slice(0, 7);
        const valor = Number(item.amount) || 0;

        const registro = mapaMensal.get(anoMes) || {
            anoMes,
            rotuloCurto: formatarRotuloCurtoDoMes(anoMes),
            totalReceitas: 0,
            totalDespesas: 0,
            saldo: 0,
        };

        if (item.type === 'income') {
            registro.totalReceitas += valor;
        } else if (item.type === 'expense') {
            registro.totalDespesas += valor;
        }

        registro.saldo = registro.totalReceitas - registro.totalDespesas;
        mapaMensal.set(anoMes, registro);
    });

    // Ordena cronologicamente (antigo -> recente) e mantém os últimos N meses
    return Array.from(mapaMensal.values())
        .sort((a, b) => a.anoMes.localeCompare(b.anoMes))
        .slice(-limiteDeMeses);
}
