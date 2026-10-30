import { test as base, type APIRequestContext } from '@playwright/test';
import { CarrinhoPage, CatalogoPage, CheckoutPage, LoginPage, PedidoPage } from '../pages';
import { clientes } from './dados';

type Cliente = (typeof clientes)[keyof typeof clientes];

interface Fixtures {
  login: LoginPage;
  catalogo: CatalogoPage;
  carrinho: CarrinhoPage;
  checkout: CheckoutPage;
  pedido: PedidoPage;
  /**
   * Autentica pela API e grava o cookie de sessão no navegador. Mais rápido que
   * passar pela tela de login e garante um carrinho novo e vazio por teste.
   */
  entrarComo: (cliente?: Cliente) => Promise<void>;
}

/** Faz login pela API e devolve o token de sessão. */
export async function obterToken(request: APIRequestContext, cliente: Cliente = clientes.ana): Promise<string> {
  const resposta = await request.post('/api/login', {
    data: { email: cliente.email, senha: cliente.senha },
  });
  if (!resposta.ok()) throw new Error(`Login de ${cliente.email} falhou: ${resposta.status()}`);
  const { token } = (await resposta.json()) as { token: string };
  return token;
}

export const test = base.extend<Fixtures>({
  login: async ({ page }, use) => use(new LoginPage(page)),
  catalogo: async ({ page }, use) => use(new CatalogoPage(page)),
  carrinho: async ({ page }, use) => use(new CarrinhoPage(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
  pedido: async ({ page }, use) => use(new PedidoPage(page)),
  entrarComo: async ({ context, request, baseURL }, use) => {
    await use(async (cliente = clientes.ana) => {
      const token = await obterToken(request, cliente);
      await context.addCookies([{ name: 'sessao', value: token, url: baseURL ?? 'http://localhost:3100' }]);
    });
  },
});

export { expect } from '@playwright/test';
