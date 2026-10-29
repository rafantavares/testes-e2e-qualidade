# Guia para sessões do Claude Code

Projeto de portfólio público do Rafael (QA/automação de testes). Qualidade e clareza importam mais que velocidade.

## Como trabalhar
- Pegue uma issue aberta do milestone mais antigo, trabalhe em uma branch `feat/<numero>-<slug>` e abra PR com `Closes #N`.
- Uma issue por PR. Commits em português, padrão Conventional Commits.
- Atualize o README (Roadmap) quando um milestone for concluído.

## Padrões técnicos
- Playwright com TypeScript (strict). Page Objects em `pages/`, testes em `tests/<tipo>/`.
- Seletores: prefira `getByRole`, `getByLabel`, `getByText`; use `data-testid` só como último recurso.
- Nada de `waitForTimeout`; use asserções com espera automática (`expect(...).toBeVisible()`).
- Cada teste é independente e pode rodar em paralelo.
- Respeite os termos de uso da aplicação alvo; não rode carga contra sites de terceiros.
- Nomes de testes e documentação em português.

## Antes de abrir PR
```bash
npm run lint && npx tsc --noEmit && npx playwright test
```
