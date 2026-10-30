import { analisarAcessibilidade } from '../../fixtures/a11y';
import { entrega, produtos } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

// Cada página é analisada no estado em que o usuário a vê, incluindo os
// estados de erro, que costumam ser esquecidos nas revisões de acessibilidade.

test.describe('Acessibilidade (WCAG 2.1 AA)', () => {
  test('página inicial', async ({ page, catalogo }, testInfo) => {
    await catalogo.abrir();
    await expect(catalogo.titulo).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test('resultado de busca', async ({ page, catalogo }, testInfo) => {
    await catalogo.abrir();
    await catalogo.buscar('monitor');
    await expect(catalogo.resumoBusca).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test('busca sem resultados', async ({ page, catalogo }, testInfo) => {
    await catalogo.abrir();
    await catalogo.buscar('geladeira');
    await expect(catalogo.semResultados).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test('login', async ({ page, login }, testInfo) => {
    await login.abrir();
    await expect(login.titulo).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test('login com erro', async ({ page, login }, testInfo) => {
    await login.abrir();
    await login.entrar('cliente@loja.test', 'senha-errada');
    await expect(login.alerta).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test('carrinho vazio', async ({ page, entrarComo, carrinho }, testInfo) => {
    await entrarComo();
    await carrinho.abrir();
    await expect(carrinho.carrinhoVazio).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });

  test.describe('com itens no carrinho', () => {
    test.beforeEach(async ({ entrarComo, catalogo }) => {
      await entrarComo();
      await catalogo.abrir();
      await catalogo.adicionarAoCarrinho(produtos.teclado.nome);
    });

    test('carrinho com itens', async ({ page, carrinho }, testInfo) => {
      await expect(carrinho.itens).toHaveCount(1);

      expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
    });

    test('checkout', async ({ page, carrinho, checkout }, testInfo) => {
      await carrinho.finalizarCompra();
      await expect(checkout.titulo).toBeVisible();

      expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
    });

    test('checkout com erro de validação', async ({ page, carrinho, checkout }, testInfo) => {
      await carrinho.finalizarCompra();
      await checkout.preencher({ ...entrega, cep: '1' });
      await checkout.confirmar();
      await expect(checkout.alerta).toBeVisible();

      expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
    });

    test('pedido confirmado', async ({ page, carrinho, checkout, pedido }, testInfo) => {
      await carrinho.finalizarCompra();
      await checkout.preencher({ ...entrega, pagamento: 'Pix' });
      await checkout.confirmar();
      await expect(pedido.titulo).toBeVisible();

      expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
    });
  });

  test('página não encontrada', async ({ page }, testInfo) => {
    await page.goto('/nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

    expect(await analisarAcessibilidade(page, testInfo)).toEqual([]);
  });
});
