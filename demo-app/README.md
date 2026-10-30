# Loja Demo

Aplicação alvo da suíte de testes. É uma loja fictícia, sem dependências externas, criada só para ser testada (ver [decisão D1](../docs/decisoes.md)).

```bash
npm run demo          # http://localhost:3000
PORT=4000 npm run demo
```

## Usuários de teste

| E-mail | Senha | Nome |
|---|---|---|
| `cliente@loja.test` | `senha123` | Ana Cliente |
| `outro@loja.test` | `senha456` | Bruno Comprador |

## Páginas

| Rota | Descrição |
|---|---|
| `GET /` | Catálogo com busca |
| `GET /busca?q=` | Resultado da busca (por nome ou categoria, ignora acentos) |
| `GET /login` | Formulário de login |
| `GET /carrinho` | Itens do carrinho (exige login) |
| `GET /checkout` | Dados de entrega e pagamento (exige login e carrinho com itens) |
| `GET /pedidos/:id` | Confirmação do pedido |

## API REST

Autenticação por `Authorization: Bearer <token>`, obtido em `POST /api/login`. Erros respondem `{ "erro": "mensagem" }`.

| Método e rota | Sucesso | Erros |
|---|---|---|
| `GET /api/saude` | 200 `{ status }` | — |
| `POST /api/login` `{ email, senha }` | 200 `{ token, usuario }` | 401 |
| `GET /api/produtos?q=` | 200 `{ total, itens }` | — |
| `GET /api/produtos/:id` | 200 produto | 404 |
| `GET /api/carrinho` | 200 `{ itens, quantidadeTotal, total }` | 401 |
| `POST /api/carrinho/itens` `{ produtoId, quantidade }` | 201 carrinho | 400, 401, 404, 409 (estoque) |
| `DELETE /api/carrinho/itens/:produtoId` | 200 carrinho | 401, 404 |
| `POST /api/pedidos` `{ nome, cep, endereco, pagamento }` | 201 pedido | 400, 401 |
| `GET /api/pedidos/:id` | 200 pedido | 401, 404 |

`pagamento` aceita `pix`, `boleto` ou `cartao`. O produto 6 (Caixa de som Bluetooth) está sempre esgotado, para cobrir esse cenário.

O estado fica em memória e é perdido ao reiniciar o servidor. Cada login cria uma sessão com carrinho próprio.
