# Retrospectiva — M1 a M5

**Período:** 29 a 30/10/2026 · **Issues:** #1 a #10 · **PRs:** #11 a #23

## O que foi entregue

| Milestone | Issue | PR | Entrega |
|---|---|---|---|
| M1 – Fundação | #1 | #11 | Loja Demo própria em `demo-app/` (páginas + API REST, sem dependências) e decisão D1 |
| | #2 | #12 | Playwright + TypeScript strict + ESLint, projetos por navegador e CI no GitHub Actions |
| | #3 | #13 | Plano de testes com 10 riscos priorizados e critérios de entrada/saída |
| M2 – Fluxos E2E | #4 | #14 | Page Objects com seletores acessíveis e fixtures com login via API |
| | #5 | #15 | 23 cenários E2E: login, busca, carrinho e checkout |
| M3 – API e acessibilidade | #6 | #16 | 40 testes de API com JSON Schema (Ajv) e limite de tempo de resposta |
| | #7 | #17 | axe-core em 11 estados de página (WCAG 2.1 A/AA) |
| M4 – Visual e multinavegador | #8 | #18 | 7 snapshots visuais com máscara e tolerância, baseline por SO |
| | #9 | #19 | Perfil mobile (Pixel 7) e CI em 4 shards com relatório unificado |
| M5 – Relatórios | #10 | #20, #23 | Relatório publicado no GitHub Pages a cada execução na `main` |
| — | — | #21 | Correção de um teste flaky detectado na `main` |

### Números finais

| Projeto | Testes |
|---|---|
| `chromium`, `firefox`, `webkit`, `mobile` (E2E) | 24 cada = 96 |
| `api` | 40 |
| `a11y` | 11 |
| `visual` | 7 |
| **Total** | **154** |

No CI, cada um dos 4 shards leva cerca de 1 minuto, e o relatório unificado é gerado em seguida.

## Defeitos que a suíte encontrou

A aplicação é pequena e foi escrita junto com os testes, mesmo assim a suíte achou três defeitos reais, o que mostra o valor das camadas além do E2E:

1. **Acessibilidade (#7):** o nome acessível dos botões "Adicionar ao carrinho" não continha o texto visível (axe `label-content-name-mismatch`, WCAG 2.5.3). Quem usa comando de voz não conseguiria acionar o botão.
2. **Responsividade (#9):** no perfil mobile, a tabela do carrinho estourava a largura da tela e uma célula ficava por cima do botão "Remover".
3. **Responsividade (#9):** depois da primeira correção, o novo teste de "sem rolagem horizontal" ainda falhou. Um texto `.sr-only` com `position: absolute` escapava do container rolável.

## Decisões principais

- **Aplicação alvo própria** em vez de uma demo pública ([D1](decisoes.md)): CI determinístico, sem rede externa e sem carga em site de terceiros.
- **Estado isolado por sessão** na demo-app e **login via API** na fixture `entrarComo()`: cada teste tem carrinho próprio, então todos rodam em paralelo e em qualquer ordem.
- **Um projeto por tipo de teste:** API não abre navegador; a11y e visual rodam só no Chromium; os fluxos E2E rodam nas três engines e no mobile.
- **CI no container oficial do Playwright** (`v1.64.1-noble`), com `@playwright/test` fixado na mesma versão: renderização determinística para os snapshots.
- **Baseline visual por SO:** Linux para o CI e Windows para rodar localmente. A de Linux foi gerada pelo próprio CI, publicada como artefato, revisada e só então commitada.
- **Porta 3100 nos testes:** a 3000 estava ocupada por outro projeto de desenvolvimento na máquina local, e `reuseExistingServer` poderia apontar os testes para o servidor errado.
- **Deploy do Pages condicional:** o job verifica se o Pages está ativo antes de publicar, para não deixar a `main` vermelha por causa de uma configuração pendente.

## O que funcionou bem

- Começar pela aplicação alvo e pelo plano de testes deixou as issues seguintes diretas: a matriz de rastreabilidade do plano já previa os arquivos de teste que foram criados.
- Os matchers customizados (`toMatchSchema`, `toResponder`) deixam os testes de API curtos e as falhas legíveis.
- Rodar o teste mais de uma vez (`--repeat-each`) antes de abrir PR e olhar o resumo de *flaky* do CI pegou uma condição de corrida que passaria despercebida.

## O que não funcionou e o que mudou

- **Um commit foi direto para a `main` sem PR (testes da #5).** O comando que criaria a branch falhou antes de rodar e o script de PR fez push do branch atual. O commit foi revertido (sem force-push, para não reescrever o histórico) e voltou pela PR #15. O script passou a recusar push a partir da `main` e a conferir se a branch remota existe.
- **Push travando de forma intermitente** no Git Credential Manager. Passei a usar o `gh` como helper de credenciais, com timeout.
- **Teste flaky no WebKit** (`não permite passar do estoque disponível`): `adicionarAoCarrinho()` não esperava o POST do formulário terminar antes do próximo `goto()`. A correção ficou no Page Object (PR #21) e protege todos os testes que adicionam vários itens.

## Pendências

| Item | Responsável | Como resolver |
|---|---|---|
| ~~"Métricas de qualidade" citadas no Roadmap do M5~~ | — | Resolvido na #24: taxa de *flaky*, duração por projeto e cobertura de riscos, publicadas em `/metricas/` no GitHub Pages. |
| Baseline visual de macOS | — | Só existem `linux` e `win32`. Quem rodar no macOS precisa gerar a própria com `--update-snapshots`. |
| Branch protection na `main` | Rafael | Exigir PR e o check **Testes Playwright** evitaria pushes diretos como o que aconteceu na #5. |
