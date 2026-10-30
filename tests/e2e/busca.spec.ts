import { produtos } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

test.describe('Busca', () => {
  test.beforeEach(async ({ catalogo }) => {
    await catalogo.abrir();
  });

  test('encontra produtos pelo nome', async ({ page, catalogo }) => {
    await catalogo.buscar('monitor');

    await expect(page).toHaveURL('/busca?q=monitor');
    await expect(catalogo.titulo).toHaveText('Resultados para “monitor”');
    await expect(catalogo.resumoBusca).toHaveText('2 produto(s) encontrado(s)');
    await expect(catalogo.produtos.getByRole('heading')).toHaveText([
      produtos.monitor24.nome,
      produtos.monitor27.nome,
    ]);
  });

  test('ignora acentos e maiúsculas no termo', async ({ catalogo }) => {
    await catalogo.buscar('ERGONOMICA');

    await expect(catalogo.produtos).toHaveCount(1);
    await expect(catalogo.produto('Cadeira ergonômica')).toBeVisible();
  });

  test('encontra produtos pela categoria', async ({ catalogo }) => {
    await catalogo.buscar('áudio');

    await expect(catalogo.resumoBusca).toHaveText('2 produto(s) encontrado(s)');
    await expect(catalogo.produto(produtos.headset.nome)).toBeVisible();
    await expect(catalogo.produto(produtos.caixaDeSom.nome)).toBeVisible();
  });

  test('informa quando nenhum produto é encontrado', async ({ catalogo }) => {
    await catalogo.buscar('geladeira');

    await expect(catalogo.resumoBusca).toHaveText('0 produto(s) encontrado(s)');
    await expect(catalogo.semResultados).toBeVisible();
    await expect(catalogo.produtos).toHaveCount(0);
  });

  test('exibe o termo como texto, sem interpretar HTML', async ({ page, catalogo }) => {
    const termo = '<img src=x onerror=alert(1)>';
    let abriuDialogo = false;
    page.on('dialog', async (dialogo) => {
      abriuDialogo = true;
      await dialogo.dismiss();
    });

    await catalogo.buscar(termo);

    await expect(catalogo.titulo).toHaveText(`Resultados para “${termo}”`);
    await expect(catalogo.campoBusca).toHaveValue(termo);
    await expect(page.getByRole('main').getByRole('img')).toHaveCount(0);
    expect(abriuDialogo).toBe(false);
  });
});
