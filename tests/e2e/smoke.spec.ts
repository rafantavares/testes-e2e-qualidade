import { expect, test } from '../../fixtures/test';
import { produtos } from '../../fixtures/dados';

// Fumaça: cada Page Object encontra os elementos principais da sua página.

test('a página inicial carrega o catálogo', async ({ page, catalogo }) => {
  await catalogo.abrir();
  await expect(page).toHaveTitle(/Loja Demo/);
  await expect(catalogo.titulo).toHaveText('Produtos');
  await expect(catalogo.campoBusca).toBeVisible();
  await expect(catalogo.produto(produtos.teclado.nome)).toBeVisible();
  await expect(catalogo.cabecalho.linkEntrar).toBeVisible();
});

test('a página de login exibe o formulário', async ({ login }) => {
  await login.abrir();
  await expect(login.titulo).toBeVisible();
  await expect(login.campoEmail).toBeEditable();
  await expect(login.campoSenha).toBeEditable();
  await expect(login.botaoEntrar).toBeEnabled();
});

test('carrinho e checkout abrem para um cliente autenticado', async ({ entrarComo, catalogo, carrinho, checkout }) => {
  await entrarComo();
  await carrinho.abrir();
  await expect(carrinho.titulo).toBeVisible();
  await expect(carrinho.carrinhoVazio).toBeVisible();

  await catalogo.abrir();
  await catalogo.adicionarAoCarrinho(produtos.mouse.nome);
  await expect(carrinho.item(produtos.mouse.nome)).toBeVisible();
  await carrinho.finalizarCompra();
  await expect(checkout.titulo).toBeVisible();
  await expect(checkout.grupoPagamento.getByRole('radio')).toHaveCount(3);
});
