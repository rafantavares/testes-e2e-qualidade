# ✅ Testes E2E e Qualidade

> Suíte de testes automatizados de ponta a ponta com Playwright — interface, API, acessibilidade e regressão visual — rodando em CI com relatório publicado a cada execução.

[![CI](https://github.com/rafantavares/testes-e2e-qualidade/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rafantavares/testes-e2e-qualidade/actions/workflows/ci.yml) [![relatório](https://img.shields.io/badge/relat%C3%B3rio-Playwright-2EAD33)](https://rafantavares.github.io/testes-e2e-qualidade/) [![métricas](https://img.shields.io/badge/m%C3%A9tricas-qualidade-2EAD33)](https://rafantavares.github.io/testes-e2e-qualidade/metricas/) ![playwright](https://img.shields.io/badge/playwright-TypeScript-2EAD33) ![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

## Por que este projeto existe

Testar manualmente não escala. Este projeto mostra como estruturar uma suíte de testes que um time real conseguiria manter: organizada, rápida, confiável (sem testes "flaky") e integrada ao fluxo de entrega.

## O que é testado

| Tipo | Ferramenta | Exemplo |
|---|---|---|
| Fluxos de interface (E2E) | Playwright | Login, busca, carrinho, checkout |
| API | Playwright `request` | Contratos e códigos de status |
| Acessibilidade | axe-core | Violações WCAG nas páginas principais |
| Regressão visual | Screenshots do Playwright | Comparação de telas entre versões |
| Multinavegador e mobile | Chromium, Firefox, WebKit e Pixel 7 | Mesmos fluxos E2E em três engines e num celular |

A aplicação alvo é a [Loja Demo](demo-app/), uma loja fictícia mantida neste repositório e iniciada automaticamente pelos testes (decisão registrada em [docs/decisoes.md](docs/decisoes.md)).

## Documentação

- [Plano de testes](docs/plano-de-testes.md) — escopo, riscos priorizados, tipos de teste e critérios de entrada e saída
- [Registro de decisões](docs/decisoes.md)
- [Métricas de qualidade](https://rafantavares.github.io/testes-e2e-qualidade/metricas/) — totais, taxa de *flaky*, duração por projeto e cobertura dos riscos da última execução na `main`
- [Retrospectiva M1–M5](docs/retrospectiva.md) — o que foi entregue, defeitos encontrados e pendências

## Estrutura

```
tests/
  e2e/          fluxos de usuário
  api/          testes de API
  a11y/         acessibilidade
  visual/       regressão visual
  unidade/      testes unitários dos scripts de apoio
pages/          Page Objects
fixtures/       dados e fixtures customizadas
scripts/        cálculo das métricas de qualidade
demo-app/       aplicação alvo (loja de demonstração)
docs/           decisões, plano de testes e retrospectiva
```

## Boas práticas aplicadas

- **Page Object Model** para isolar seletores
- Seletores por papel e texto acessível (`getByRole`), não por CSS frágil
- Dados de teste independentes e limpeza após cada teste
- Execução paralela e *retries* só no CI, com rastreamento (*trace*) de falhas
- Relatório HTML e métricas de qualidade publicados no GitHub Pages

## Roadmap

| Milestone | Entrega | Status |
|---|---|---|
| **M1 – Fundação** | Projeto Playwright, escolha do alvo, CI básico | ✅ |
| **M2 – Fluxos E2E** | Page Objects e fluxos críticos cobertos | ✅ |
| **M3 – API e acessibilidade** | Testes de API e verificação com axe | ✅ |
| **M4 – Visual e multinavegador** | Regressão visual e matriz de navegadores | ✅ |
| **M5 – Relatórios** | Relatório publicado, plano de testes e métricas de qualidade | ✅ |

## Como rodar

```bash
git clone https://github.com/rafantavares/testes-e2e-qualidade
cd testes-e2e-qualidade
npm ci
npx playwright install --with-deps   # Chromium, Firefox e WebKit
npx playwright test
npx playwright show-report
```

O Playwright sobe a loja sozinho (na porta 3100, ou `PORT`) antes dos testes. Scripts úteis: `npm run demo` (só a loja, em http://localhost:3000), `npm run lint`, `npm run typecheck` e `npm test`.

No CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) a suíte roda no container oficial do Playwright, dividida em **4 shards** paralelos; um job final junta os relatórios em um HTML único (artefato `relatorio-playwright`). Há *retries* (2), e *trace*, vídeo e screenshot são guardados apenas das falhas.

| Projeto | O que roda | Navegador |
|---|---|---|
| `chromium`, `firefox`, `webkit` | `tests/e2e` | Desktop |
| `mobile` | `tests/e2e` | Pixel 7 (Chromium, toque, 412 px) |
| `api` | `tests/api` | — |
| `a11y` | `tests/a11y` | Chromium |
| `visual` | `tests/visual` | Chromium |
| `unidade` | `tests/unidade` | — |

Para rodar um projeto só: `npx playwright test --project=mobile`.

## Relatório publicado

A cada execução do CI na `main`, o job **Publicar relatório no GitHub Pages** junta o relatório HTML dos shards e o publica em **https://rafantavares.github.io/testes-e2e-qualidade/** — inclusive quando há falhas, com *trace*, vídeo e screenshot de cada uma.

## Métricas de qualidade

O mesmo job gera, a partir do relatório JSON dos shards, as métricas que respondem "dá para confiar nesta execução?":

- **Totais e taxas**: testes que passaram, falharam, foram pulados ou só passaram no *retry* (*flaky*), taxa de sucesso e taxa de *flaky*.
- **Duração**: total da execução, tempo somado por projeto e os 5 testes mais lentos.
- **Cobertura dos riscos** do [plano de testes](docs/plano-de-testes.md#3-riscos-priorizados): para cada risco R1–R10, quantos testes o cobrem e a situação (`ok`, `falhou`, `flaky`, `incompleto` quando falta um projeto da matriz, ou `sem testes`), além do critério de saída 4.

Elas aparecem no resumo do job **Testes Playwright** de cada execução (inclusive em PRs) e ficam publicadas em **https://rafantavares.github.io/testes-e2e-qualidade/metricas/**, com o JSON em [`metricas.json`](https://rafantavares.github.io/testes-e2e-qualidade/metricas/metricas.json). O cálculo fica em [`scripts/metricas.ts`](scripts/metricas.ts), com testes em `tests/unidade/`. Para gerar localmente:

```bash
PLAYWRIGHT_JSON_OUTPUT_FILE=resultados.json npx playwright test --reporter=json
npm run metricas -- resultados.json   # grava em metricas/
```

## Regressão visual

As baselines ficam em `tests/visual/__snapshots__/`, uma por sistema operacional (`*-linux.png` é a usada no CI, `*-win32.png` a do Windows). Para aceitar uma mudança visual intencional:

1. Rode `npx playwright test --project visual --update-snapshots` no seu SO.
2. Para Linux, baixe o artefato **snapshots-linux** da execução do CI e copie os PNGs para a pasta.
3. Revise as imagens antes de commitar.

## Autor

**Rafael Nunes Tavares** — estudante de Engenharia de Software (ULBRA Palmas)
[GitHub](https://github.com/rafantavares)

## Licença

[MIT](LICENSE)
