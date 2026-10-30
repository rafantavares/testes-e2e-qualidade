import { expect, test } from '../../fixtures/api';
import { clientes } from '../../fixtures/dados';
import { schemas } from '../../fixtures/schemas';

test.describe('API · login e saúde', () => {
  test('GET /api/saude responde ok', async ({ anonimo }) => {
    const r = await anonimo.get('/api/saude');

    await expect(r).toResponder(200);
    expect(r.corpo).toEqual({ status: 'ok' });
    expect(r.resposta.headers()['content-type']).toContain('application/json');
  });

  test('POST /api/login devolve token e dados do usuário', async ({ anonimo }) => {
    const r = await anonimo.post('/api/login', { email: clientes.ana.email, senha: clientes.ana.senha });

    await expect(r).toResponder(200);
    expect(r.corpo).toMatchSchema(schemas.login);
    expect(r.corpo).toMatchObject({ usuario: { nome: clientes.ana.nome, email: clientes.ana.email } });
  });

  test('cada login gera um token diferente', async ({ anonimo }) => {
    const credenciais = { email: clientes.ana.email, senha: clientes.ana.senha };
    const [a, b] = await Promise.all([anonimo.post('/api/login', credenciais), anonimo.post('/api/login', credenciais)]);

    expect((a.corpo as { token: string }).token).not.toBe((b.corpo as { token: string }).token);
  });

  const invalidos = [
    { caso: 'senha errada', dados: { email: clientes.ana.email, senha: 'x' } },
    { caso: 'e-mail inexistente', dados: { email: 'ninguem@loja.test', senha: 'senha123' } },
    { caso: 'corpo vazio', dados: {} },
  ];
  for (const { caso, dados } of invalidos) {
    test(`POST /api/login com ${caso} responde 401`, async ({ anonimo }) => {
      const r = await anonimo.post('/api/login', dados);

      await expect(r).toResponder(401);
      expect(r.corpo).toMatchSchema(schemas.erro);
      expect(r.corpo).toEqual({ erro: 'E-mail ou senha inválidos.' });
    });
  }

  test('JSON malformado responde 400', async ({ anonimo }) => {
    const r = await anonimo.postTexto('/api/login', '{"email": ');

    await expect(r).toResponder(400);
    expect(r.corpo).toEqual({ erro: 'JSON inválido.' });
  });

  test('rota inexistente responde 404 em JSON', async ({ anonimo }) => {
    const r = await anonimo.get('/api/nao-existe');

    await expect(r).toResponder(404);
    expect(r.corpo).toMatchSchema(schemas.erro);
  });
});
