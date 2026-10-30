# Registro de decisões

Decisões técnicas do projeto, no formato contexto → opções → decisão → consequências.

## D1 — Aplicação alvo dos testes (issue #1)

**Data:** 2026-10-29

### Contexto

A suíte precisa de uma aplicação com login, busca, carrinho, checkout e uma API REST. Os testes rodam no CI a cada push e em paralelo, então o alvo precisa ser estável, ter estado previsível e permitir execução repetida sem violar termos de uso.

### Opções avaliadas

| Critério | Demo pública de terceiros (ex.: lojas "feitas para testes") | App próprio dentro do repositório |
|---|---|---|
| Estabilidade | Depende da disponibilidade do site; fora do ar = CI vermelho sem culpa da suíte | Sobe junto com os testes; versão fixa no próprio commit |
| Termos de uso | Rodar a suíte inteira em paralelo e em matriz de navegadores a cada push gera carga em site de terceiros | Sem restrição |
| Cobertura de fluxos | Boa, mas a API costuma ser limitada ou inexistente | Login, busca, carrinho, checkout e API REST sob medida |
| Estado previsível | Dados mudam sem aviso; outros usuários alteram o estado | Dados fixos em `demo-app/dados.mjs` e estado isolado por sessão |
| Rede | Exige acesso à internet no CI e no ambiente local | Funciona offline |
| Regressão visual | Mudanças de layout do site quebram snapshots | Layout controlado pelo projeto |

### Decisão

Criar uma **loja de demonstração própria em `demo-app/`**, escrita só com a biblioteca padrão do Node.js (sem dependências), iniciada automaticamente pelo `webServer` do Playwright no CI e localmente.

- Páginas renderizadas no servidor: início, busca, login, carrinho, checkout e confirmação de pedido.
- API REST em `/api` (login, produtos, carrinho, pedidos e verificação de saúde).
- Estado em memória **isolado por sessão**: cada login gera um token e um carrinho novos, o que torna os testes independentes e paralelizáveis.
- Usuários e senhas são valores fictícios de teste, documentados em `demo-app/README.md`.

### Consequências

- (+) CI determinístico e sem dependência de rede externa.
- (+) Liberdade para cobrir casos de erro (estoque esgotado, validação de checkout, 401/404) que um site de terceiros não expõe.
- (−) A aplicação é simples e não representa a complexidade de um sistema real (sem banco, sem JavaScript no cliente). A suíte foi pensada para que trocar o alvo exija mudar apenas `baseURL`, Page Objects e fixtures.
- (−) Bugs da própria demo-app são responsabilidade do projeto; por isso ela tem regras pequenas e explícitas em `demo-app/loja.mjs`.
