/**
 * CAMADA DE ARMAZENAMENTO (OFFLINE-FIRST + SANITIZAÇÃO DEFENSIVA)
 * ---------------------------------------------------------------
 * Isola onde os dados são guardados e valida a estrutura ao ler
 * do localStorage, evitando que dados corrompidos quebrem o app.
 */

const CHAVES_STORAGE = {
    MOVIMENTACOES: 'finpulse_transactions',
    CATEGORIAS: 'finpulse_categories',
    PERFIL_ACESSO: 'finpulse_access_profile',
};

const REGEX_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function sanitizarMovimentacaoSalva(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }

    const tipo = item.type === 'income' || item.type === 'expense' ? item.type : null;
    const valor = Number(item.amount);
    const descricao = typeof item.description === 'string' ? item.description.trim().slice(0, 80) : '';
    const categoria = typeof item.category === 'string' ? item.category.trim().slice(0, 40) : '';
    const data = typeof item.date === 'string' && REGEX_DATA_ISO.test(item.date) ? item.date : '';
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : '';

    if (!id || !tipo || !descricao || !categoria || !data || !Number.isFinite(valor) || valor <= 0) {
        return null;
    }

    return {
        id,
        type: tipo,
        description: descricao,
        amount: Math.round(valor * 100) / 100,
        date: data,
        category: categoria,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
        ...(typeof item.updatedAt === 'string' ? { updatedAt: item.updatedAt } : {}),
    };
}

function sanitizarCategoriaSalva(cat) {
    if (!cat || typeof cat !== 'object') {
        return null;
    }

    const tipo = cat.type === 'income' || cat.type === 'expense' ? cat.type : null;
    const nome = typeof cat.name === 'string' ? cat.name.trim().slice(0, 32) : '';
    const id = typeof cat.id === 'string' && cat.id.trim() ? cat.id.trim() : '';

    if (!id || !tipo || !nome) {
        return null;
    }

    return { id, name: nome, type: tipo };
}

export function carregarMovimentacoesLocais() {
    try {
        const dadosSalvos = localStorage.getItem(CHAVES_STORAGE.MOVIMENTACOES);
        if (!dadosSalvos) {
            return [];
        }

        const parsed = JSON.parse(dadosSalvos);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(sanitizarMovimentacaoSalva).filter(Boolean);
    } catch (erro) {
        console.error('Erro ao ler movimentações do localStorage:', erro);
        return [];
    }
}

export function salvarMovimentacoesLocais(movimentacoes) {
    try {
        localStorage.setItem(CHAVES_STORAGE.MOVIMENTACOES, JSON.stringify(movimentacoes));
    } catch (erro) {
        console.error('Erro ao salvar movimentações no localStorage:', erro);
    }
}

export function carregarCategoriasLocais() {
    try {
        const dadosSalvos = localStorage.getItem(CHAVES_STORAGE.CATEGORIAS);
        if (!dadosSalvos) {
            return null;
        }

        const parsed = JSON.parse(dadosSalvos);
        if (!Array.isArray(parsed)) {
            return null;
        }

        const sanitizadas = parsed.map(sanitizarCategoriaSalva).filter(Boolean);
        return sanitizadas.length > 0 ? sanitizadas : null;
    } catch (erro) {
        console.error('Erro ao ler categorias do localStorage:', erro);
        return null;
    }
}

export function salvarCategoriasLocais(categorias) {
    try {
        localStorage.setItem(CHAVES_STORAGE.CATEGORIAS, JSON.stringify(categorias));
    } catch (erro) {
        console.error('Erro ao salvar categorias no localStorage:', erro);
    }
}

export function carregarPerfilDeAcessoLocal() {
    try {
        const dadosSalvos = localStorage.getItem(CHAVES_STORAGE.PERFIL_ACESSO);
        if (!dadosSalvos) {
            return null;
        }

        const parsed = JSON.parse(dadosSalvos);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const nome = typeof parsed.nome === 'string' ? parsed.nome.trim().slice(0, 40) : '';
        if (!nome) {
            return null;
        }

        return {
            nome,
            atualizadoEm: typeof parsed.atualizadoEm === 'string' ? parsed.atualizadoEm : '',
        };
    } catch (erro) {
        console.error('Erro ao ler perfil de acesso do localStorage:', erro);
        return null;
    }
}

export function salvarPerfilDeAcessoLocal(perfil) {
    try {
        const serializado = JSON.stringify(perfil);
        localStorage.setItem(CHAVES_STORAGE.PERFIL_ACESSO, serializado);

        // Confirma imediatamente que o navegador realmente persistiu o perfil
        const verificado = localStorage.getItem(CHAVES_STORAGE.PERFIL_ACESSO);
        return Boolean(verificado);
    } catch (erro) {
        console.error('Erro ao salvar perfil de acesso no localStorage:', erro);
        return false;
    }
}

export function resetarTodosOsDadosLocais() {
    try {
        localStorage.removeItem(CHAVES_STORAGE.MOVIMENTACOES);
        localStorage.removeItem(CHAVES_STORAGE.CATEGORIAS);
        localStorage.removeItem(CHAVES_STORAGE.PERFIL_ACESSO);
        return true;
    } catch (erro) {
        console.error('Erro ao resetar dados locais:', erro);
        return false;
    }
}
