# ✅ Testes E2E e Qualidade

> Suíte de testes automatizados de ponta a ponta com Playwright — interface, API, acessibilidade e regressão visual — rodando em CI com relatório publicado a cada execução.

![status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow) ![playwright](https://img.shields.io/badge/playwright-TypeScript-2EAD33) ![licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)

## Por que este projeto existe

Testar manualmente não escala. Este projeto mostra como estruturar uma suíte de testes que um time real conseguiria manter: organizada, rápida, confiável (sem testes "flaky") e integrada ao fluxo de entrega.

## O que é testado

| Tipo | Ferramenta | Exemplo |
|---|---|---|
| Fluxos de interface (E2E) | Playwright | Login, busca, carrinho, checkout |
| API | Playwright `request` | Contratos e códigos de status |
| Acessibilidade | axe-core | Violações WCAG nas páginas principais |
| Regressão visual | Screenshots do Playwright | Comparação de telas entre versões |
| Multinavegador | Chromium, Firefox, WebKit | Mesmo teste em três engines |

A aplicação alvo será definida na issue #1 (aplicação de demonstração pública ou app próprio rodando via Docker no CI).

## Estrutura

```
tests/
  e2e/          fluxos de usuário
  api/          testes de API
  a11y/         acessibilidade
  visual/       regressão visual
pages/          Page Objects
fixtures/       dados e fixtures customizadas
```

## Boas práticas aplicadas

- **Page Object Model** para isolar seletores
- Seletores por papel e texto acessível (`getByRole`), não por CSS frágil
- Dados de teste independentes e limpeza após cada teste
- Execução paralela e *retries* só no CI, com rastreamento (*trace*) de falhas
- Relatório HTML publicado no GitHub Pages

## Roadmap

| Milestone | Entrega | Status |
|---|---|---|
| **M1 – Fundação** | Projeto Playwright, escolha do alvo, CI básico | ⏳ |
| **M2 – Fluxos E2E** | Page Objects e fluxos críticos cobertos | ⏳ |
| **M3 – API e acessibilidade** | Testes de API e verificação com axe | ⏳ |
| **M4 – Visual e multinavegador** | Regressão visual e matriz de navegadores | ⏳ |
| **M5 – Relatórios** | Relatório publicado, plano de testes e métricas de qualidade | ⏳ |

## Como rodar (em construção)

```bash
git clone https://github.com/rafantavares/testes-e2e-qualidade
cd testes-e2e-qualidade
npm ci
npx playwright install --with-deps
npx playwright test
npx playwright show-report
```

## Autor

**Rafael Nunes Tavares** — estudante de Engenharia de Software (ULBRA Palmas)
[GitHub](https://github.com/rafantavares)

## Licença

[MIT](LICENSE)
