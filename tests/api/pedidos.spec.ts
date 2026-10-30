import { expect, test } from '../../fixtures/api';
import { clientes, entrega, produtos } from '../../fixtures/dados';
import { schemas, type Carrinho, type Pedido } from '../../fixtures/schemas';

const dadosValidos = { ...entrega, pagamento: 'pix' };

test.describe('API · pedidos', () => {
  test('POST /api/pedidos sem token responde 401', async ({ anonimo }) => {
    const r = await anonimo.post('/api/pedidos', dadosValidos);

    await expect(r).toResponder(401);
  });

  test('POST /api/pedidos com carrinho vazio responde 400', async ({ api }) => {
    const r = await api.post('/api/pedidos', dadosValidos);

    await expect(r).toResponder(400);
    expect(r.corpo).toEqual({ erro: 'O carrinho está vazio.' });
  });

  test.describe('com itens no carrinho', () => {
    test.beforeEach(async ({ api }) => {
      await api.post('/api/carrinho/itens', { produtoId: produtos.teclado.id, quantidade: 2 });
      await api.post('/api/carrinho/itens', { produtoId: produtos.headset.id });
    });

    test('cria o pedido com itens, total e status confirmado', async ({ api }) => {
      const r = await api.post('/api/pedidos', dadosValidos);

      await expect(r).toResponder(201);
      expect(r.corpo).toMatchSchema(schemas.pedido);
      const pedido = r.corpo as Pedido;
      expect(pedido).toMatchObject({
        status: 'confirmado',
        cliente: clientes.ana.email,
        pagamento: 'pix',
        entrega: { nome: entrega.nome, cep: entrega.cep, endereco: entrega.endereco },
        total: 949.3,
      });
      expect(pedido.itens.map((i) => [i.produtoId, i.quantidade])).toEqual([
        [produtos.teclado.id, 2],
        [produtos.headset.id, 1],
      ]);
      expect(Date.now() - Date.parse(pedido.criadoEm)).toBeLessThan(60_000);
    });

    test('esvazia o carrinho depois do pedido', async ({ api }) => {
      await api.post('/api/pedidos', dadosValidos);

      const r = await api.get('/api/carrinho');
      expect((r.corpo as Carrinho).itens).toEqual([]);
    });

    test('GET /api/pedidos/:id devolve o pedido ao dono', async ({ api }) => {
      const criado = (await api.post('/api/pedidos', dadosValidos)).corpo as Pedido;

      const r = await api.get(`/api/pedidos/${criado.id}`);

      await expect(r).toResponder(200);
      expect(r.corpo).toMatchSchema(schemas.pedido);
      expect(r.corpo).toEqual(criado);
    });

    test('outro cliente não consegue ver o pedido', async ({ api, entrarNaApi }) => {
      const criado = (await api.post('/api/pedidos', dadosValidos)).corpo as Pedido;
      const bruno = await entrarNaApi(clientes.bruno);

      const r = await bruno.get(`/api/pedidos/${criado.id}`);

      await expect(r).toResponder(404);
      expect(r.corpo).toEqual({ erro: 'Pedido não encontrado.' });
    });

    const invalidos = [
      { caso: 'sem nome', dados: { ...dadosValidos, nome: '  ' }, mensagem: 'Informe o nome completo.' },
      { caso: 'CEP inválido', dados: { ...dadosValidos, cep: '7700' }, mensagem: 'Informe um CEP válido (00000-000).' },
      { caso: 'sem endereço', dados: { ...dadosValidos, endereco: '' }, mensagem: 'Informe o endereço de entrega.' },
      { caso: 'pagamento desconhecido', dados: { ...dadosValidos, pagamento: 'cheque' }, mensagem: 'Escolha a forma de pagamento.' },
    ];
    for (const { caso, dados, mensagem } of invalidos) {
      test(`recusa pedido ${caso} com 400 e mantém o carrinho`, async ({ api }) => {
        const r = await api.post('/api/pedidos', dados);

        await expect(r).toResponder(400);
        expect(r.corpo).toMatchSchema(schemas.erro);
        expect((r.corpo as { erro: string }).erro).toContain(mensagem);
        const carrinho = await api.get('/api/carrinho');
        expect((carrinho.corpo as Carrinho).quantidadeTotal).toBe(3);
      });
    }
  });
});
