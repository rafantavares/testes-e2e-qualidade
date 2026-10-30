import { expect, test } from '../../fixtures/api';
import { produtos } from '../../fixtures/dados';
import { schemas, type ListaProdutos } from '../../fixtures/schemas';

test.describe('API · produtos', () => {
  test('GET /api/produtos lista o catálogo completo', async ({ anonimo }) => {
    const r = await anonimo.get('/api/produtos');

    await expect(r).toResponder(200);
    expect(r.corpo).toMatchSchema(schemas.listaProdutos);
    const { total, itens } = r.corpo as ListaProdutos;
    expect(total).toBe(8);
    expect(itens).toHaveLength(total);
    expect(new Set(itens.map((p) => p.id)).size).toBe(total);
  });

  const buscas = [
    { termo: 'monitor', esperados: [produtos.monitor24.id, produtos.monitor27.id] },
    { termo: 'ERGONOMICA', esperados: [8] },
    { termo: 'áudio', esperados: [produtos.headset.id, produtos.caixaDeSom.id] },
    { termo: 'geladeira', esperados: [] },
  ];
  for (const { termo, esperados } of buscas) {
    test(`GET /api/produtos?q=${termo} filtra por nome ou categoria`, async ({ anonimo }) => {
      const r = await anonimo.get(`/api/produtos?q=${encodeURIComponent(termo)}`);

      await expect(r).toResponder(200);
      expect(r.corpo).toMatchSchema(schemas.listaProdutos);
      const { total, itens } = r.corpo as ListaProdutos;
      expect(itens.map((p) => p.id)).toEqual(esperados);
      expect(total).toBe(esperados.length);
    });
  }

  test('GET /api/produtos/:id devolve o produto', async ({ anonimo }) => {
    const r = await anonimo.get(`/api/produtos/${produtos.teclado.id}`);

    await expect(r).toResponder(200);
    expect(r.corpo).toMatchSchema(schemas.produto);
    expect(r.corpo).toMatchObject({ id: produtos.teclado.id, nome: produtos.teclado.nome, preco: produtos.teclado.preco });
  });

  test('GET /api/produtos/:id inexistente responde 404', async ({ anonimo }) => {
    const r = await anonimo.get('/api/produtos/999');

    await expect(r).toResponder(404);
    expect(r.corpo).toEqual({ erro: 'Produto não encontrado.' });
  });
});
