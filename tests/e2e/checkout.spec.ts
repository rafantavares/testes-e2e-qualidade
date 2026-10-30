import { emReais, entrega, produtos } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

test.describe('Finalizar compra', () => {
  test.beforeEach(async ({ entrarComo, catalogo }) => {
    await entrarComo();
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.teclado.nome);
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.mouse.nome);
  });

  test('cliente finaliza a compra com Pix e recebe a confirmação', async ({ page, carrinho, checkout, pedido }) => {
    const total = emReais(produtos.teclado.preco + produtos.mouse.preco);
    await carrinho.finalizarCompra();
    await expect(checkout.totalAPagar).toHaveText(`Total a pagar: ${total}`);

    await checkout.preencher({ ...entrega, pagamento: 'Pix' });
    await checkout.confirmar();

    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    await expect(pedido.titulo).toBeVisible();
    await expect(pedido.numeroPedido).toBeVisible();
    await expect(pedido.total).toHaveText(`Total: ${total}`);
    await expect(pedido.cabecalho.quantidadeNoCarrinho(0)).toBeVisible();
  });

  test('carrinho fica vazio depois da compra', async ({ carrinho, checkout, pedido }) => {
    await carrinho.finalizarCompra();
    await checkout.preencher({ ...entrega, pagamento: 'Boleto' });
    await checkout.confirmar();
    await expect(pedido.titulo).toBeVisible();

    await carrinho.abrir();
    await expect(carrinho.carrinhoVazio).toBeVisible();
  });

  test('valida os campos e mantém o que foi digitado', async ({ page, carrinho, checkout }) => {
    await carrinho.finalizarCompra();
    // Campos vazios o próprio navegador bloqueia (required); CEP mal formatado e
    // falta de pagamento chegam ao servidor e exercitam a validação de lá.
    await checkout.preencher({ ...entrega, cep: '123' });
    await checkout.confirmar();

    await expect(checkout.alerta).toContainText('Informe um CEP válido (00000-000).');
    await expect(checkout.alerta).toContainText('Escolha a forma de pagamento.');
    await expect(page).toHaveURL('/checkout');
    await expect(checkout.campoNome).toHaveValue(entrega.nome);
    await expect(checkout.campoEndereco).toHaveValue(entrega.endereco);
  });

  test('corrige os dados após um erro e conclui a compra', async ({ carrinho, checkout, pedido }) => {
    await carrinho.finalizarCompra();
    await checkout.preencher({ ...entrega, cep: 'abc' });
    await checkout.confirmar();
    await expect(checkout.alerta).toBeVisible();

    await checkout.campoCep.fill(entrega.cep);
    await checkout.grupoPagamento.getByRole('radio', { name: 'Cartão de crédito' }).check();
    await checkout.confirmar();

    await expect(pedido.titulo).toBeVisible();
  });
});
