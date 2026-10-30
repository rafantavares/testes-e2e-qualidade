import { emReais, produtos } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

test.describe('Carrinho', () => {
  test('adiciona um produto e atualiza contador e total', async ({ page, entrarComo, catalogo, carrinho }) => {
    await entrarComo();
    await catalogo.abrir();
    await expect(catalogo.cabecalho.quantidadeNoCarrinho(0)).toBeVisible();

    await catalogo.adicionarAoCarrinho(produtos.teclado.nome);

    await expect(page).toHaveURL('/carrinho');
    await expect(carrinho.itens).toHaveCount(1);
    await expect(carrinho.item(produtos.teclado.nome).getByRole('cell')).toHaveText([
      produtos.teclado.nome,
      '1',
      emReais(produtos.teclado.preco),
      emReais(produtos.teclado.preco),
      'Remover',
    ]);
    await expect(carrinho.total).toHaveText(`Total: ${emReais(produtos.teclado.preco)}`);
    await expect(carrinho.cabecalho.quantidadeNoCarrinho(1)).toBeVisible();
  });

  test('soma quantidades e subtotais de vários produtos', async ({ entrarComo, catalogo, carrinho }) => {
    await entrarComo();
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.mouse.nome);
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.mouse.nome);
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.headset.nome);

    const totalEsperado = produtos.mouse.preco * 2 + produtos.headset.preco;
    await expect(carrinho.itens).toHaveCount(2);
    const mouse = carrinho.item(produtos.mouse.nome).getByRole('cell');
    await expect(mouse.nth(1)).toHaveText('2');
    await expect(mouse.nth(3)).toHaveText(emReais(produtos.mouse.preco * 2));
    await expect(carrinho.total).toHaveText(`Total: ${emReais(totalEsperado)}`);
    await expect(carrinho.cabecalho.quantidadeNoCarrinho(3)).toBeVisible();
  });

  test('remove um produto do carrinho', async ({ entrarComo, catalogo, carrinho }) => {
    await entrarComo();
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.mouse.nome);

    await carrinho.remover(produtos.mouse.nome);

    await expect(carrinho.carrinhoVazio).toBeVisible();
    await expect(carrinho.linkFinalizar).toBeHidden();
    await expect(carrinho.cabecalho.quantidadeNoCarrinho(0)).toBeVisible();
  });

  test('produto esgotado não pode ser adicionado', async ({ entrarComo, catalogo }) => {
    await entrarComo();
    await catalogo.abrir();

    await expect(catalogo.produto(produtos.caixaDeSom.nome).getByText('Esgotado')).toBeVisible();
    await expect(catalogo.botaoAdicionar(produtos.caixaDeSom.nome)).toHaveCount(0);
  });

  test('não permite passar do estoque disponível', async ({ entrarComo, catalogo, carrinho }) => {
    await entrarComo();
    for (let i = 0; i <= produtos.monitor27.estoque; i++) {
      await catalogo.abrir();
      await catalogo.adicionarAoCarrinho(produtos.monitor27.nome);
    }

    await expect(carrinho.alerta).toHaveText('Estoque insuficiente.');
    await expect(carrinho.item(produtos.monitor27.nome).getByRole('cell').nth(1)).toHaveText(
      String(produtos.monitor27.estoque),
    );
  });

  test('visitante sem login é levado à tela de login ao adicionar', async ({ catalogo, login }) => {
    await catalogo.abrir();
    await catalogo.adicionarAoCarrinho(produtos.teclado.nome);

    await expect(login.titulo).toBeVisible();
  });
});
