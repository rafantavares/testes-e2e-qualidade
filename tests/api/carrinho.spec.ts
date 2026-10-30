import { expect, test, type ClienteApi } from '../../fixtures/api';
import { clientes, produtos } from '../../fixtures/dados';
import { schemas, type Carrinho } from '../../fixtures/schemas';

test.describe('API · carrinho', () => {
  const rotasProtegidas = [
    { rota: 'GET /api/carrinho', chamar: (c: ClienteApi) => c.get('/api/carrinho') },
    { rota: 'POST /api/carrinho/itens', chamar: (c: ClienteApi) => c.post('/api/carrinho/itens', { produtoId: 1 }) },
    { rota: 'DELETE /api/carrinho/itens/1', chamar: (c: ClienteApi) => c.delete('/api/carrinho/itens/1') },
  ];
  for (const { rota, chamar } of rotasProtegidas) {
    test(`${rota} sem token responde 401`, async ({ anonimo }) => {
      const r = await chamar(anonimo);

      await expect(r).toResponder(401);
      expect(r.corpo).toEqual({ erro: 'Autenticação necessária.' });
    });
  }

  test('token inválido é tratado como não autenticado', async ({ request }) => {
    const resposta = await request.get('/api/carrinho', { headers: { Authorization: 'Bearer token-falso' } });
    expect(resposta.status()).toBe(401);
  });

  test('carrinho de uma sessão nova começa vazio', async ({ api }) => {
    const r = await api.get('/api/carrinho');

    await expect(r).toResponder(200);
    expect(r.corpo).toMatchSchema(schemas.carrinho);
    expect(r.corpo).toEqual({ itens: [], quantidadeTotal: 0, total: 0 });
  });

  test('POST /api/carrinho/itens adiciona e calcula subtotal e total', async ({ api }) => {
    await api.post('/api/carrinho/itens', { produtoId: produtos.mouse.id, quantidade: 2 });
    const r = await api.post('/api/carrinho/itens', { produtoId: produtos.headset.id });

    await expect(r).toResponder(201);
    expect(r.corpo).toMatchSchema(schemas.carrinho);
    expect(r.corpo).toEqual({
      itens: [
        { produtoId: produtos.mouse.id, nome: produtos.mouse.nome, precoUnitario: 129.9, quantidade: 2, subtotal: 259.8 },
        { produtoId: produtos.headset.id, nome: produtos.headset.nome, precoUnitario: 249.5, quantidade: 1, subtotal: 249.5 },
      ],
      quantidadeTotal: 3,
      total: 509.3,
    });
  });

  test('adicionar o mesmo produto soma a quantidade', async ({ api }) => {
    await api.post('/api/carrinho/itens', { produtoId: produtos.teclado.id });
    const r = await api.post('/api/carrinho/itens', { produtoId: produtos.teclado.id });

    const { itens } = r.corpo as Carrinho;
    expect(itens).toHaveLength(1);
    expect(itens[0]?.quantidade).toBe(2);
  });

  const invalidos = [
    { caso: 'produto inexistente', dados: { produtoId: 999 }, status: 404, erro: 'Produto não encontrado.' },
    { caso: 'quantidade zero', dados: { produtoId: 1, quantidade: 0 }, status: 400, erro: 'Quantidade inválida.' },
    { caso: 'quantidade fracionada', dados: { produtoId: 1, quantidade: 1.5 }, status: 400, erro: 'Quantidade inválida.' },
    { caso: 'produto esgotado', dados: { produtoId: produtos.caixaDeSom.id }, status: 409, erro: 'Estoque insuficiente.' },
    { caso: 'acima do estoque', dados: { produtoId: produtos.monitor27.id, quantidade: 4 }, status: 409, erro: 'Estoque insuficiente.' },
  ];
  for (const { caso, dados, status, erro } of invalidos) {
    test(`POST /api/carrinho/itens com ${caso} responde ${status}`, async ({ api }) => {
      const r = await api.post('/api/carrinho/itens', dados);

      await expect(r).toResponder(status);
      expect(r.corpo).toEqual({ erro });
      const carrinho = await api.get('/api/carrinho');
      expect((carrinho.corpo as Carrinho).itens).toEqual([]);
    });
  }

  test('DELETE /api/carrinho/itens/:id remove o item', async ({ api }) => {
    await api.post('/api/carrinho/itens', { produtoId: produtos.teclado.id });
    await api.post('/api/carrinho/itens', { produtoId: produtos.mouse.id });

    const r = await api.delete(`/api/carrinho/itens/${produtos.teclado.id}`);

    await expect(r).toResponder(200);
    expect(r.corpo).toMatchSchema(schemas.carrinho);
    expect((r.corpo as Carrinho).itens.map((i) => i.produtoId)).toEqual([produtos.mouse.id]);
    expect((r.corpo as Carrinho).total).toBe(produtos.mouse.preco);
  });

  test('DELETE de item que não está no carrinho responde 404', async ({ api }) => {
    const r = await api.delete(`/api/carrinho/itens/${produtos.teclado.id}`);

    await expect(r).toResponder(404);
    expect(r.corpo).toEqual({ erro: 'Item não está no carrinho.' });
  });

  test('carrinhos de sessões diferentes não se misturam', async ({ api, entrarNaApi }) => {
    const outraSessao = await entrarNaApi(clientes.bruno);
    await api.post('/api/carrinho/itens', { produtoId: produtos.teclado.id });

    const r = await outraSessao.get('/api/carrinho');
    expect((r.corpo as Carrinho).itens).toEqual([]);
  });
});
