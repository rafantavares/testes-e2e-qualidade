import { clientes } from '../../fixtures/dados';
import { expect, test } from '../../fixtures/test';

test.describe('Login', () => {
  test('cliente entra com credenciais válidas e volta para a loja', async ({ page, login, catalogo }) => {
    await login.abrir();
    await login.entrar(clientes.ana.email, clientes.ana.senha);

    await expect(page).toHaveURL('/');
    await expect(catalogo.cabecalho.saudacao(clientes.ana.nome)).toBeVisible();
    await expect(catalogo.cabecalho.linkEntrar).toBeHidden();
  });

  const invalidos = [
    { caso: 'senha errada', email: clientes.ana.email, senha: 'senha-errada' },
    { caso: 'e-mail não cadastrado', email: 'ninguem@loja.test', senha: clientes.ana.senha },
  ];
  for (const { caso, email, senha } of invalidos) {
    test(`login é recusado com ${caso}`, async ({ page, login }) => {
      await login.abrir();
      await login.entrar(email, senha);

      await expect(login.alerta).toHaveText('E-mail ou senha inválidos.');
      await expect(page).toHaveURL('/login');
      await expect(login.campoEmail).toHaveValue(email);
      await expect(login.campoSenha).toBeEmpty();
      await expect(login.cabecalho.linkEntrar).toBeVisible();
    });
  }

  test('página protegida pede login e devolve o cliente ao destino', async ({ page, login, carrinho }) => {
    await carrinho.abrir();
    await expect(login.titulo).toBeVisible();

    await login.entrar(clientes.bruno.email, clientes.bruno.senha);
    await expect(page).toHaveURL('/carrinho');
    await expect(carrinho.cabecalho.saudacao(clientes.bruno.nome)).toBeVisible();
  });

  test('cliente sai da conta', async ({ entrarComo, catalogo }) => {
    await entrarComo();
    await catalogo.abrir();
    await catalogo.cabecalho.sair();

    await expect(catalogo.cabecalho.linkEntrar).toBeVisible();
    await expect(catalogo.cabecalho.botaoSair).toBeHidden();
  });
});
