# Plano de testes — Loja Demo

| | |
|---|---|
| **Sistema sob teste** | [Loja Demo](../demo-app/) (páginas + API REST), versão do próprio commit |
| **Responsável** | Rafael Nunes Tavares |
| **Ferramentas** | Playwright (TypeScript), axe-core, GitHub Actions |
| **Última revisão** | 2026-10-29 |

## 1. Objetivo

Garantir, a cada mudança, que os fluxos que geram receita da loja (entrar, encontrar um produto, colocar no carrinho e comprar) continuam funcionando em diferentes navegadores, que a API respeita o contrato combinado e que as páginas principais seguem acessíveis e visualmente estáveis.

## 2. Escopo

### Dentro do escopo

| Área | O que é verificado |
|---|---|
| Autenticação | Login válido, login inválido, redirecionamento para o destino após login, logout, proteção das rotas que exigem sessão |
| Catálogo e busca | Listagem, busca por nome e categoria (sem acento), busca sem resultado, escape de HTML no termo |
| Carrinho | Adicionar, remover, somatório, produto esgotado, limite de estoque |
| Checkout | Validação dos campos, escolha de pagamento, confirmação do pedido, carrinho esvaziado após a compra |
| API REST | Códigos de status, schema das respostas, mensagens de erro, autenticação por token, tempo de resposta |
| Acessibilidade | Violações WCAG 2.1 A/AA de impacto **crítico** ou **sério** (axe-core) nas páginas principais |
| Regressão visual | Início, busca, login, carrinho e checkout, com áreas dinâmicas mascaradas |
| Compatibilidade | Chromium, Firefox, WebKit e um perfil mobile |

### Fora do escopo

- Testes de carga e desempenho além do limite simples de tempo de resposta da API (a loja roda em memória; números de carga não teriam significado).
- Segurança além de verificações pontuais (escape de HTML, redirecionamento aberto, rotas protegidas). Não há pentest.
- Integrações reais de pagamento e frete — não existem na aplicação.
- Persistência: o estado é em memória por decisão de projeto ([D1](decisoes.md)).
- Testes unitários da própria demo-app: ela é o alvo, não o produto deste repositório.

## 3. Riscos priorizados

Probabilidade (P) e impacto (I) de 1 a 3; prioridade = P × I. Os riscos de maior prioridade são cobertos primeiro e em mais camadas.

| # | Risco | P | I | Prioridade | Mitigação (testes) |
|---|---|---|---|---|---|
| R1 | Cliente não consegue finalizar a compra | 2 | 3 | **6** | E2E do checkout completo; API `POST /api/pedidos`; validações de campos |
| R2 | Total do carrinho/pedido calculado errado | 2 | 3 | **6** | E2E confere total na tela; API confere `subtotal` e `total` |
| R3 | Login quebra ou aceita credencial inválida | 1 | 3 | **3** | E2E válido e inválido; API 200/401; rotas protegidas redirecionam |
| R4 | Busca não encontra produtos existentes | 2 | 2 | **4** | E2E e API com termos com e sem acento, por categoria e sem resultado |
| R5 | Venda de produto esgotado ou acima do estoque | 2 | 2 | **4** | E2E (botão ausente); API 409 |
| R6 | Mudança de contrato da API quebra clientes | 2 | 2 | **4** | Validação de schema em todas as respostas usadas pelos fluxos |
| R7 | Página inacessível para leitores de tela/teclado | 2 | 2 | **4** | axe-core nas páginas principais; seletores por papel acessível nos E2E |
| R8 | Quebra de layout não percebida | 2 | 1 | **2** | Snapshots visuais com tolerância |
| R9 | Funciona em um navegador e falha em outro | 1 | 2 | **2** | Matriz Chromium/Firefox/WebKit/mobile no CI |
| R10 | Testes instáveis (*flaky*) minam a confiança na suíte | 2 | 2 | **4** | Nada de `waitForTimeout`, asserções web-first, dados isolados por sessão, retries só no CI e monitoramento de testes que só passam no retry |

## 4. Tipos de teste e organização

| Tipo | Pasta | Projetos | Observações |
|---|---|---|---|
| E2E de interface | `tests/e2e/` | Todos os navegadores | Page Objects em `pages/`; cada teste cria a própria sessão |
| API | `tests/api/` | Um projeto só (não depende de navegador) | Fixture `request` do Playwright; schemas em `fixtures/` |
| Acessibilidade | `tests/a11y/` | Chromium | `@axe-core/playwright`, tags WCAG 2.1 A/AA |
| Regressão visual | `tests/visual/` | Chromium | Snapshots versionados, gerados no Linux (mesmo SO do CI) |
| Unitário | `tests/unidade/` | Um projeto só (sem navegador) | Scripts de apoio, como o cálculo das métricas de qualidade |

Pirâmide pretendida: a maior parte das regras de negócio é verificada pela API (rápida e estável); os E2E cobrem os caminhos que o usuário percorre de ponta a ponta; visual e acessibilidade ficam nas páginas principais.

## 5. Dados de teste

- Usuários e produtos fixos em [`demo-app/dados.mjs`](../demo-app/dados.mjs) e documentados em [`demo-app/README.md`](../demo-app/README.md).
- Cada teste faz o próprio login e recebe um carrinho vazio, então os testes não compartilham estado e podem rodar em paralelo e em qualquer ordem.
- O produto 6 está sempre esgotado para cobrir esse cenário sem preparar dados.

## 6. Ambiente

- Local: `npx playwright test` sobe a loja automaticamente (`webServer`).
- CI: GitHub Actions, Ubuntu, Node 22, a cada *push* na `main` e em cada *pull request*.

## 7. Critérios de entrada

Uma mudança entra em teste quando:

1. A aplicação sobe e `GET /api/saude` responde 200.
2. `npm run lint` e `npx tsc --noEmit` passam.
3. A mudança está em uma branch com PR aberto e vinculada a uma issue.

## 8. Critérios de saída

Uma mudança pode ser integrada na `main` quando:

1. 100% dos testes passam no CI em todos os projetos da matriz.
2. Nenhuma violação de acessibilidade crítica ou séria.
3. Nenhuma diferença visual acima da tolerância configurada sem atualização revisada do snapshot.
4. Todos os riscos de prioridade ≥ 4 têm ao menos um teste automatizado passando.
5. Testes que passaram só no *retry* são investigados (abrir issue) em vez de ignorados.

## 9. Rastreabilidade

| Risco | Testes |
|---|---|
| R1, R2 | `tests/e2e/checkout.spec.ts`, `tests/api/pedidos.spec.ts` |
| R3 | `tests/e2e/login.spec.ts`, `tests/api/login.spec.ts` |
| R4 | `tests/e2e/busca.spec.ts`, `tests/api/produtos.spec.ts` |
| R5 | `tests/e2e/carrinho.spec.ts`, `tests/api/carrinho.spec.ts` |
| R6 | `tests/api/*` (validação de schema) |
| R7 | `tests/a11y/paginas.spec.ts` |
| R8 | `tests/visual/telas.spec.ts`, `tests/e2e/carrinho.spec.ts` (sem rolagem horizontal) |
| R9 | Projetos `chromium`, `firefox`, `webkit` e `mobile` em `playwright.config.ts`, em 4 shards no CI |
| R10 | A suíte inteira: taxa de *flaky* acompanhada nas métricas de qualidade |

Todos os arquivos acima existem desde o M4 (ver [retrospectiva](retrospectiva.md)).

Esta tabela também está codificada em `scripts/metricas.ts` (`RISCOS`): a cada execução do CI, as [métricas de qualidade](https://rafantavares.github.io/testes-e2e-qualidade/metricas/) mostram quantos testes cobrem cada risco e se todos passaram, o que verifica os critérios de saída 4 e 5 automaticamente. Ao mudar esta seção, atualize as duas.
