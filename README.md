# FinPulse — Gestão Financeira Pessoal (PWA Offline-First)

![HTML5](https://img.shields.io/badge/HTML5-Sem%C3%A2ntico-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Design%20System-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Offline--First-0EA5E9?style=flat-square)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-10B981?style=flat-square)

**FinPulse** é uma aplicação web progressiva (**PWA**) de gestão financeira pessoal construída com **HTML5, CSS3 e JavaScript puro (ES Modules)**, projetada com foco em **arquitetura limpa, funcionamento 100% offline, segurança client-side e experiência visual moderna**.

Todo o projeto foi planejado em camadas desacopladas para facilitar a manutenção e permitir uma futura evolução para **Full Stack** (API + Banco de Dados com sincronização offline) sem precisar reescrever a interface nem as regras de negócio.

---

## Índice

- [Principais Funcionalidades](#principais-funcionalidades)
- [Arquitetura e Decisões Técnicas](#arquitetura-e-decisões-técnicas)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Modelo de Dados](#modelo-de-dados)
- [Segurança e Resiliência](#segurança-e-resiliência)
- [PWA e Compatibilidade com PWABuilder](#pwa-e-compatibilidade-com-pwabuilder)
- [Como Executar Localmente](#como-executar-localmente)
- [Deploy na Vercel e Empacotamento](#deploy-na-vercel-e-empacotamento)
- [Desenvolvimento Assistido por IA](#desenvolvimento-assistido-por-ia)
- [Roadmap (Evolução Full Stack)](#roadmap-evolução-full-stack)

---

## Principais Funcionalidades

### 1. Experiência de Entrada (Onboarding em 2 Etapas)
- **Tela de Cumprimento (1º acesso):** apresentação do FinPulse com captura do nome ou apelido do usuário.
- **Tela de Boas-Vindas:** saudação personalizada (`Seja Bem-Vindo(a), [Nome]!`) com transição suave entre telas e acesso direto ao sistema.
- **Persistência de perfil:** nos acessos seguintes, o sistema pula automaticamente a etapa de cadastro e vai direto para a Tela de Boas-Vindas.

### 2. Header Inteligente com Filtro Dinâmico de Meses
- O seletor de períodos lista **apenas os meses que realmente possuem movimentações registradas** (além da visão consolidada *"Todos os períodos"*).
- Caso o usuário comece a utilizar o app no meio do ano ou exclua todos os lançamentos de um determinado mês, o filtro se reorganiza automaticamente sem exibir meses vazios.

### 3. Painéis de Resumo Financeiro
- **Saldo atual** (com destaque semântico automático em vermelho quando negativo), **Receitas (Entradas)** e **Despesas (Saídas)**.
- Contagem contextual de lançamentos e atualização reativa instantânea ao mudar o filtro de mês ou registrar/editar/excluir movimentações.

### 4. Lançamento de Movimentações e Categorias Inteligentes
- **Máscara monetária em tempo real (`R$ 0,00`):** digitação no padrão bancário brasileiro com armazenamento interno em valor numérico puro (evitando erros de ponto flutuante).
- **Separação de categorias por tipo:** ao selecionar **Despesa**, exibem-se apenas categorias coerentes com saídas (*Alimentação, Moradia, Contas, Transporte, Saúde, Lazer e Passeios, Educação, Compras, Outras despesas*); ao selecionar **Receita**, apenas categorias de entradas (*Salário, Renda Extra, Freelance, Investimentos, Reembolso, Outras receitas*).
- **Auto-manutenibilidade:** criação de novas categorias (escolhendo se pertencem a Despesa ou Receita) tanto pelo próprio `<select>` quanto pelo painel **Gerenciar categorias**, que também permite excluir categorias com confirmação inline e proteção contra exclusão da última categoria disponível.

### 5. Histórico Interativo + Modal em Vidro Fosco (*Glassmorphism*)
- Lista compacta e ordenada da data mais recente para a mais antiga, com ícone direcional (entrada/saída), descrição, tag de categoria, data e valor formatado.
- Clicar em qualquer movimentação abre um modal translúcido com efeito **vidro fosco** permitindo **editar** ou **excluir** o registro — **ambas as ações exigem confirmação explícita** dentro do próprio modal.
- Preservação de integridade histórica: lançamentos antigos pertencentes a categorias posteriormente excluídas continuam editáveis exibindo o rótulo `(arquivada)`.

### 6. Dashboard Analítico (100% Offline em SVG Puro)
- **4 KPIs inteligentes:** Taxa de economia (com diagnóstico automático de saúde financeira), Renda comprometida (com barra de progresso), Maior categoria de gasto e Ticket médio das despesas.
- **Gráfico Donut (Rosca) interativo:** distribuição percentual das despesas por categoria com destaque dinâmico no centro ao passar o mouse nas fatias ou na legenda.
- **Gráfico de Barras Mensais (Receitas × Despesas):** comparativo cronológico dos últimos 6 meses com movimentação; clicar em um mês no gráfico filtra toda a aplicação para aquele período.
- **Detalhamento por categoria:** ranking com barras proporcionais e abas para alternar entre **Despesas** e **Receitas**.

### 7. Gestão de Conta e Dados
- Acessível de forma separada pelo ícone de perfil no Header (fora das telas de entrada), com confirmação obrigatória em todas as operações:
  - Alterar nome ou apelido;
  - Apagar histórico de um mês específico;
  - Apagar todo o histórico (preservando nome e categorias);
  - **Zona de perigo:** reset permanente da conta (remove todos os dados locais e retorna ao fluxo inicial).

### 8. Micro-interações e Scroll Reveal (100% GPU)
- Animações construídas exclusivamente com propriedades compostas pela GPU (`opacity` e `transform: translate3d`), sem engasgos.
- Revelação sequencial das seções visíveis + **Scroll Reveal** com `IntersectionObserver` nativo para as seções abaixo da dobra.
- Feedback visual dedicado ao adicionar, editar e excluir itens do histórico.
- Suporte integral à preferência de acessibilidade `@media (prefers-reduced-motion: reduce)`.

---

## Arquitetura e Decisões Técnicas

O front-end foi estruturado seguindo princípios de **Clean Architecture**, **Separação de Responsabilidades** e **Linguagem Ubíqua** (*Domain-Driven Design*):

```text
┌────────────────────────────────────────────────────────────────────┐
│  js/main.js  (Camada de Interface / Orquestração do DOM)           │
│  Escuta eventos da tela, aciona o domínio e atualiza o HTML        │
└───────────────┬──────────────────────┬─────────────────────────────┘
                │                      │
                ▼                      ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│  js/financeDomain.js         │  │  js/dashboardCharts.js           │
│  Regras de negócio PURAS     │  │  Renderização de gráficos        │
│  - 0 acesso ao DOM           │  │  em SVG puro (100% offline)      │
│  - 0 estado global externo   │  └──────────────────────────────────┘
│  - Funções imutáveis         │
└──────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────────────┐
│  js/storage.js  (Camada de Persistência Offline-First)             │
│  Isola o localStorage com sanitização defensiva de esquema.        │
│  Ponto único de integração para futura API Full Stack.             │
└────────────────────────────────────────────────────────────────────┘
```

### Decisões-chave
1. **Funções puras de domínio (`js/financeDomain.js`):** nenhuma regra de cálculo, validação, agrupamento ou formatação depende do HTML ou do CSS. Se a interface for migrada para React, Vue ou reutilizada em um backend Node.js, o domínio permanece intacto.
2. **Linguagem Ubíqua:** nomes de funções explícitos e livres de ambiguidade (ex.: `calcularSaldoEntradasESaidas`, `extrairMesesComMovimentacoes`, `excluirMovimentacoesPorMes`, `agruparFluxoMensalDeReceitasEDespesas`), priorizando legibilidade e segurança em manutenções futuras.
3. **Gráficos em SVG puro sem bibliotecas CDN:** garante carregamento instantâneo, controle visual total sobre o tema dark e funcionamento real sem internet.
4. **Design System centralizado em `:root` (`style.css`):** todas as cores, gradientes, raios de borda, sombras e tokens de movimento ficam centralizados em CSS Custom Properties.

---

## Estrutura de Pastas

```text
controle-de-despesas/
├── index.html                  # Estrutura semântica HTML5, modais e metadados PWA
├── style.css                   # Design System (:root), layout responsivo, vidro fosco e transições
├── manifest.webmanifest        # Web App Manifest completo (padrão PWABuilder)
├── sw.js                       # Service Worker offline-first (pre-cache + estratégias de rede)
├── vercel.json                 # Cabeçalhos de segurança HTTP (CSP, anti-clickjacking, SW/Manifest)
├── README.md                   # Documentação técnica do projeto
├── icons/                      # Ícones PNG reais (any, maskable e Apple Touch Icon)
│   ├── apple-touch-icon.png    # 180×180 (iOS)
│   ├── icon-192.png            # 192×192 (any)
│   ├── icon-512.png            # 512×512 (any)
│   ├── icon-maskable-192.png   # 192×192 (maskable / Android adaptativo)
│   └── icon-maskable-512.png   # 512×512 (maskable / Android adaptativo)
└── js/
    ├── financeDomain.js        # Regras de negócio puras, validações e cálculos do dashboard
    ├── storage.js              # Persistência local isolada com validação estrutural
    ├── dashboardCharts.js      # Renderização SVG pura do Donut e das Barras Mensais
    └── main.js                 # Orquestração da UI, eventos, transições e instalação PWA
```

---

## Modelo de Dados

Os dados são armazenados localmente no navegador do próprio usuário sob três chaves isoladas, já modeladas com identificadores únicos (UUID), datas em padrão ISO (`YYYY-MM-DD`) e timestamps para facilitar uma futura sincronização com banco de dados relacional ou NoSQL:

### `finpulse_transactions`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "expense",
    "description": "Supermercado",
    "amount": 250.5,
    "date": "2026-11-21",
    "category": "Alimentação",
    "createdAt": "2026-11-21T23:10:00.000Z",
    "updatedAt": "2026-11-21T23:45:00.000Z"
  }
]
```

### `finpulse_categories`
```json
[
  {
    "id": "cat-exp-alimentacao",
    "name": "Alimentação",
    "type": "expense"
  }
]
```

### `finpulse_access_profile`
```json
{
  "nome": "usuário (exemplo)",
  "atualizadoEm": "2026-11-21T23:45:00.000Z (exemplo)"
}
```

---

## Segurança e Resiliência

Mesmo sendo uma aplicação *client-side*, o projeto passou por uma auditoria defensiva com as seguintes proteções implementadas:

- **Proteção contra XSS (Cross-Site Scripting):** zero uso de `innerHTML` no projeto inteiro. Todos os dados inseridos pelo usuário são gravados no DOM via `textContent`, e elementos SVG dinâmicos são construídos via `document.createElementNS`.
- **Cabeçalhos HTTP de Segurança ([`vercel.json`](./vercel.json)):**
  - `Content-Security-Policy (CSP)` restringindo scripts e workers estritamente a `'self'` (`script-src 'self'`, `worker-src 'self'`, `frame-ancestors 'none'`);
  - `X-Frame-Options: DENY` (proteção contra *Clickjacking*);
  - `X-Content-Type-Options: nosniff` (proteção contra *MIME sniffing*);
  - `Referrer-Policy: no-referrer`;
  - `Permissions-Policy` desativando APIs de hardware não utilizadas (câmera, microfone, geolocalização, USB).
- **Sanitização Defensiva no Armazenamento ([`js/storage.js`](./js/storage.js)):** ao desserializar JSON do `localStorage`, cada item passa por validação de tipo, formato de data ISO e faixas numéricas finitas, impedindo que dados corrompidos quebrem a interface.
- **Validação na Camada de Domínio ([`js/financeDomain.js`](./js/financeDomain.js)):** limites de tamanho de texto, teto de valor monetário, validação de calendário real e fallback criptográfico para geração de UUID (`crypto.randomUUID()` → `crypto.getRandomValues()`).
- **Privacidade por padrão:** nenhum dado financeiro do usuário é enviado para servidores externos; cada navegador mantém seus próprios registros de forma isolada.

---

## PWA e Compatibilidade com PWABuilder

O FinPulse atende aos critérios de instalação em navegadores modernos e aos requisitos do **[PWABuilder](https://www.pwabuilder.com/)** para geração de pacotes nativos (Android APK/AAB, Windows MSIX):

- **Web App Manifest (`manifest.webmanifest`)** com `id`, `start_url`, `scope`, `display: "standalone"`, `shortcuts`, `launch_handler` e ícones PNG reais em `192×192` e `512×512` (`any` e `maskable`).
- **Service Worker (`sw.js`)** na raiz com pré-cache completo do App Shell, limpeza de versões antigas e suporte real a navegação offline (incluindo cache de fontes após o primeiro carregamento).
- **Botão de instalação integrado (`Instalar`):** captura o evento `beforeinstallprompt` e exibe um botão discreto no Header apenas nos navegadores compatíveis, ocultando-o automaticamente após a instalação (`appinstalled`).

---

## Como Executar Localmente

Como o projeto utiliza **ES Modules (`type="module"`)** e **Service Worker**, os arquivos devem ser servidos via servidor HTTP local (abrir o `index.html` diretamente por `file://` bloqueia módulos JS por política de CORS do navegador).

### Opção 1 — Extensão Live Server (VS Code)
1. Abra a pasta do projeto no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.

### Opção 2 — Via Node.js (`npx serve`)
```bash
npx serve .
```
Acesse o endereço exibido no terminal (ex.: `http://localhost:3000`).

---

## Deploy na Vercel e Empacotamento

### Publicação na Vercel
1. Enviei o repositório para o GitHub.
2. Importei o repositório na [Vercel](https://vercel.com) (não há etapa de build necessária — projeto estático puro).
3. A Vercel aplicou automaticamente as regras do `vercel.json` e publicou em `https://controle-de-despesas-eight.vercel.app`.

### Geração de App Instalável via PWABuilder
1. Com a URL `https://` publicada na Vercel, acessei **[pwabuilder.com](https://www.pwabuilder.com/)**.
2. Colei o endereço do deploy e cliquei em **Start**.
3. Após a validação do Manifest e do Service Worker, cliquei em **Package For Stores** para gerar o pacote instalável (ex.: Android APK/AAB).

---

## Desenvolvimento Assistido por IA

Este projeto foi construído **integralmente de forma colaborativa com o auxílio de Inteligência Artificial**, adotando uma metodologia incremental e didática:

- **Construção passo a passo:** cada seção (Header, Painéis de Resumo, Formulário com Categorias Inteligentes, Histórico + Modal Vidro Fosco, Dashboard SVG, Boas-Vindas e PWA) foi desenvolvida, explicada e validada individualmente.
- **Direcionamento humano de produto e engenharia:** todas as decisões de negócio, requisitos funcionais, regras de UX, critérios de design (desktop e mobile), adoção de funções puras internas, linguagem ubíqua e validações visuais foram conduzidos, revisados e testados manualmente a cada interação.
- **Uso da IA como par de programação:** apoio na escrita modular de código, refatoração arquitetural, otimização de transições em GPU, geração de ativos PWA e auditoria defensiva de segurança.

---

## Roadmap (Evolução Full Stack)

- [ ] **Backend & Banco de Dados:** criar API REST (ex.: Node.js + Express/Fastify + PostgreSQL/SQLite ou Supabase) integrada exclusivamente à camada `js/storage.js`.
- [ ] **Sincronização Offline-First:** fila local de mutações no `localStorage`/IndexedDB sincronizada automaticamente quando a conexão retornar.
- [ ] **Autenticação Real:** cadastro/login de contas com persistência na nuvem e suporte a múltiplos dispositivos (incluindo Passkeys/WebAuthn validado no servidor).
- [ ] **Exportação e Relatórios:** exportação do histórico em CSV/JSON e filtros combinados por busca textual e categoria.
