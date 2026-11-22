/**
 * CAMADA DE VISUALIZAÇÃO (GRÁFICOS EM SVG PURO — 100% OFFLINE)
 * ------------------------------------------------------------
 * Desenha o gráfico de rosca (Donut) e o gráfico de barras mensais
 * sem depender de nenhuma biblioteca externa ou internet.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export const PALETA_CORES_CATEGORIAS = [
    '#38bdf8', // Azul ciano
    '#3b82f6', // Azul safira
    '#10b981', // Verde esmeralda
    '#f59e0b', // Âmbar
    '#f43f5e', // Coral
    '#a78bfa', // Violeta suave
    '#06b6d4', // Turquesa
    '#ec4899', // Rosa
    '#84cc16', // Lima
    '#fb923c', // Laranja
];

export function obterCorDaCategoria(indice) {
    return PALETA_CORES_CATEGORIAS[indice % PALETA_CORES_CATEGORIAS.length];
}

function criarElementoSVG(tag, atributos = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(atributos).forEach(([chave, valor]) => {
        el.setAttribute(chave, String(valor));
    });
    return el;
}

function formatarEixoCompacto(valor) {
    if (valor >= 1000000) {
        return `R$ ${(valor / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (valor >= 1000) {
        const k = valor / 1000;
        return `R$ ${Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')}k`;
    }
    return `R$ ${Math.round(valor)}`;
}

/* ================================
   GRÁFICO 1: DONUT DE CATEGORIAS
   ================================ */

export function renderizarGraficoDonutDeCategorias({
    svgEl,
    legendaEl,
    centroTituloEl,
    centroValorEl,
    centroPercentualEl,
    categoriasAgrupadas,
    totalGeral,
    formatarMoeda,
}) {
    svgEl.innerHTML = '';
    legendaEl.innerHTML = '';

    const raio = 78;
    const centro = 110;
    const espessuraPadrao = 24;
    const espessuraHover = 29;
    const circunferencia = 2 * Math.PI * raio;

    // Trilha de fundo sutil
    svgEl.appendChild(
        criarElementoSVG('circle', {
            cx: centro,
            cy: centro,
            r: raio,
            fill: 'none',
            stroke: 'rgba(148, 163, 184, 0.12)',
            'stroke-width': espessuraPadrao,
        })
    );

    const restaurarCentroPadrao = () => {
        centroTituloEl.textContent = 'Total saídas';
        centroValorEl.textContent = formatarMoeda(totalGeral);
        centroPercentualEl.textContent = '100%';
    };

    restaurarCentroPadrao();

    const fatias = [];
    const itensLegenda = [];
    let deslocamentoAcumulado = 0;

    const destacarCategoria = (indiceAtivo) => {
        fatias.forEach((fatia, idx) => {
            const selecionada = idx === indiceAtivo;
            fatia.classList.toggle('is-dimmed', indiceAtivo !== null && !selecionada);
            fatia.setAttribute('stroke-width', selecionada ? espessuraHover : espessuraPadrao);
        });

        itensLegenda.forEach((item, idx) => {
            item.classList.toggle('is-active', idx === indiceAtivo);
        });

        if (indiceAtivo === null) {
            restaurarCentroPadrao();
            return;
        }

        const grupo = categoriasAgrupadas[indiceAtivo];
        centroTituloEl.textContent = grupo.categoria;
        centroValorEl.textContent = formatarMoeda(grupo.total);
        centroPercentualEl.textContent = `${grupo.percentual.toFixed(1).replace('.', ',')}%`;
    };

    const espacoEntreFatias = categoriasAgrupadas.length > 1 ? 2.5 : 0;

    categoriasAgrupadas.forEach((grupo, indice) => {
        const cor = obterCorDaCategoria(indice);
        const comprimentoBruto = (grupo.percentual / 100) * circunferencia;
        const comprimentoVisivel = Math.max(comprimentoBruto - espacoEntreFatias, 1.5);

        const circuloFatia = criarElementoSVG('circle', {
            cx: centro,
            cy: centro,
            r: raio,
            class: 'donut-slice',
            stroke: cor,
            'stroke-width': espessuraPadrao,
            'stroke-dasharray': `${comprimentoVisivel} ${circunferencia}`,
            'stroke-dashoffset': -deslocamentoAcumulado,
        });

        circuloFatia.addEventListener('mouseenter', () => destacarCategoria(indice));
        circuloFatia.addEventListener('mouseleave', () => destacarCategoria(null));

        svgEl.appendChild(circuloFatia);
        fatias.push(circuloFatia);
        deslocamentoAcumulado += comprimentoBruto;

        // Item correspondente na legenda interativa
        const li = document.createElement('li');
        li.className = 'donut-legend-item';

        const esquerda = document.createElement('div');
        esquerda.className = 'donut-legend-left';

        const bolinha = document.createElement('span');
        bolinha.className = 'donut-swatch';
        bolinha.style.backgroundColor = cor;

        const nome = document.createElement('span');
        nome.className = 'donut-legend-name';
        nome.textContent = grupo.categoria;

        esquerda.append(bolinha, nome);

        const percentual = document.createElement('span');
        percentual.className = 'donut-legend-percent';
        percentual.textContent = `${grupo.percentual.toFixed(1).replace('.', ',')}%`;

        li.append(esquerda, percentual);
        li.addEventListener('mouseenter', () => destacarCategoria(indice));
        li.addEventListener('mouseleave', () => destacarCategoria(null));

        legendaEl.appendChild(li);
        itensLegenda.push(li);
    });
}

/* ================================
   GRÁFICO 2: BARRAS MENSAIS
   ================================ */

export function renderizarGraficoBarrasMensais({
    svgEl,
    resumoHoverEl,
    seriesMensais,
    mesSelecionado,
    formatarMoeda,
    aoClicarNoMes,
}) {
    svgEl.innerHTML = '';

    const larguraTotal = 540;
    const alturaTotal = 240;
    const margem = { topo: 18, direita: 16, base: 34, esquerda: 62 };
    const larguraUtil = larguraTotal - margem.esquerda - margem.direita;
    const alturaUtil = alturaTotal - margem.topo - margem.base;

    // Gradientes verticais para as barras de Receitas e Despesas
    const defs = criarElementoSVG('defs');

    const gradReceita = criarElementoSVG('linearGradient', {
        id: 'grad-barra-receita',
        x1: '0',
        y1: '0',
        x2: '0',
        y2: '1',
    });
    gradReceita.appendChild(criarElementoSVG('stop', { offset: '0%', 'stop-color': '#34d399' }));
    gradReceita.appendChild(criarElementoSVG('stop', { offset: '100%', 'stop-color': '#059669' }));

    const gradDespesa = criarElementoSVG('linearGradient', {
        id: 'grad-barra-despesa',
        x1: '0',
        y1: '0',
        x2: '0',
        y2: '1',
    });
    gradDespesa.appendChild(criarElementoSVG('stop', { offset: '0%', 'stop-color': '#fb7185' }));
    gradDespesa.appendChild(criarElementoSVG('stop', { offset: '100%', 'stop-color': '#e11d48' }));

    defs.append(gradReceita, gradDespesa);
    svgEl.appendChild(defs);

    const maiorValor = Math.max(
        ...seriesMensais.flatMap((m) => [m.totalReceitas, m.totalDespesas]),
        1
    );
    const tetoEscala = maiorValor * 1.12;

    // Linhas horizontais de grade e valores no eixo Y
    const passos = 4;
    for (let i = 0; i <= passos; i += 1) {
        const proporcao = i / passos;
        const y = margem.topo + alturaUtil - proporcao * alturaUtil;
        const valorLinha = tetoEscala * proporcao;

        svgEl.appendChild(
            criarElementoSVG('line', {
                x1: margem.esquerda,
                y1: y,
                x2: larguraTotal - margem.direita,
                y2: y,
                class: 'bar-grid-line',
            })
        );

        const textoEixo = criarElementoSVG('text', {
            x: margem.esquerda - 8,
            y: y + 4,
            'text-anchor': 'end',
            class: 'bar-value-axis',
        });
        textoEixo.textContent = formatarEixoCompacto(valorLinha);
        svgEl.appendChild(textoEixo);
    }

    const textoPadraoHover = 'Passe o mouse ou clique em um mês para filtrar';
    resumoHoverEl.textContent = textoPadraoHover;

    const larguraSlot = larguraUtil / seriesMensais.length;
    const larguraBarra = Math.min(26, Math.max(12, larguraSlot * 0.26));
    const espacoEntreBarras = 6;
    const yBase = margem.topo + alturaUtil;

    seriesMensais.forEach((mes, indice) => {
        const xSlot = margem.esquerda + indice * larguraSlot;
        const centroSlot = xSlot + larguraSlot / 2;
        const selecionado = mesSelecionado === mes.anoMes;

        const grupo = criarElementoSVG('g', {
            class: `bar-group${selecionado ? ' is-selected' : ''}`,
        });

        // Área clicável de destaque do mês
        grupo.appendChild(
            criarElementoSVG('rect', {
                x: xSlot + 4,
                y: margem.topo - 4,
                width: Math.max(larguraSlot - 8, 24),
                height: alturaUtil + 28,
                rx: 8,
                class: 'bar-hover-bg',
            })
        );

        // Barra de Receitas
        const alturaReceita = (mes.totalReceitas / tetoEscala) * alturaUtil;
        if (alturaReceita > 0) {
            grupo.appendChild(
                criarElementoSVG('rect', {
                    x: centroSlot - larguraBarra - espacoEntreBarras / 2,
                    y: yBase - Math.max(alturaReceita, 3),
                    width: larguraBarra,
                    height: Math.max(alturaReceita, 3),
                    rx: 5,
                    fill: 'url(#grad-barra-receita)',
                    class: 'bar-rect',
                })
            );
        }

        // Barra de Despesas
        const alturaDespesa = (mes.totalDespesas / tetoEscala) * alturaUtil;
        if (alturaDespesa > 0) {
            grupo.appendChild(
                criarElementoSVG('rect', {
                    x: centroSlot + espacoEntreBarras / 2,
                    y: yBase - Math.max(alturaDespesa, 3),
                    width: larguraBarra,
                    height: Math.max(alturaDespesa, 3),
                    rx: 5,
                    fill: 'url(#grad-barra-despesa)',
                    class: 'bar-rect',
                })
            );
        }

        // Rótulo do mês no eixo X
        const rotulo = criarElementoSVG('text', {
            x: centroSlot,
            y: yBase + 20,
            'text-anchor': 'middle',
            class: `bar-axis-label${selecionado ? ' is-selected' : ''}`,
        });
        rotulo.textContent = mes.rotuloCurto;
        grupo.appendChild(rotulo);

        // Interações (hover mostra detalhes; clique alterna filtro daquele mês!)
        grupo.addEventListener('mouseenter', () => {
            resumoHoverEl.textContent = `${mes.rotuloCurto}: +${formatarMoeda(mes.totalReceitas)} | -${formatarMoeda(mes.totalDespesas)} | Saldo ${formatarMoeda(mes.saldo)}`;
        });

        grupo.addEventListener('mouseleave', () => {
            resumoHoverEl.textContent = textoPadraoHover;
        });

        grupo.addEventListener('click', () => {
            aoClicarNoMes(mes.anoMes);
        });

        svgEl.appendChild(grupo);
    });
}
