import type { Page } from '@playwright/test';
import { entrega, produtos } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

// Áreas que mudam a cada execução e não indicam regressão: o horário de geração
// da página no rodapé e o número sequencial do pedido.
function areasDinamicas(page: Page) {
  return [page.locator('.gerado-em'), page.locator('.numero-pedido')];
}

test.describe('Regressão visual', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('página inicial', async ({ page, catalogo }) => {
    await catalogo.abrir();
    await expect(catalogo.produtos).toHaveCount(8);

    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: areasDinamicas(page) });
  });

  test('resultado de busca', async ({ page, catalogo }) => {
    await catalogo.abrir();
    await catalogo.buscar('monitor');
    await expect(catalogo.produtos).toHaveCount(2);

    await expect(page).toHaveScreenshot('busca.png', { fullPage: true, mask: areasDinamicas(page) });
  });

  test('login com erro', async ({ page, login }) => {
    await login.abrir();
    await login.entrar('cliente@loja.test', 'senha-errada');
    await expect(login.alerta).toBeVisible();

    await expect(page).toHaveScreenshot('login-erro.png', { fullPage: true, mask: areasDinamicas(page) });
  });

  test.describe('com itens no carrinho', () => {
    test.beforeEach(async ({ entrarComo, catalogo }) => {
      await entrarComo();
      await catalogo.abrir();
      await catalogo.adicionarAoCarrinho(produtos.teclado.nome);
      await catalogo.abrir();
      await catalogo.adicionarAoCarrinho(produtos.mouse.nome);
    });

    test('carrinho', async ({ page, carrinho }) => {
      await expect(carrinho.itens).toHaveCount(2);

      await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: areasDinamicas(page) });
    });

    test('checkout', async ({ page, carrinho, checkout }) => {
      await carrinho.finalizarCompra();
      await expect(checkout.titulo).toBeVisible();

      await expect(page).toHaveScreenshot('checkout.png', { fullPage: true, mask: areasDinamicas(page) });
    });

    test('pedido confirmado', async ({ page, carrinho, checkout, pedido }) => {
      await carrinho.finalizarCompra();
      await checkout.preencher({ ...entrega, pagamento: 'Pix' });
      await checkout.confirmar();
      await expect(pedido.titulo).toBeVisible();

      await expect(page).toHaveScreenshot('pedido.png', { fullPage: true, mask: areasDinamicas(page) });
    });
  });

  test('cartão de produto esgotado', async ({ catalogo }) => {
    await catalogo.abrir();

    // Snapshot de um componente: falha só se o próprio cartão mudar.
    await expect(catalogo.produto(produtos.caixaDeSom.nome)).toHaveScreenshot('produto-esgotado.png');
  });
});
