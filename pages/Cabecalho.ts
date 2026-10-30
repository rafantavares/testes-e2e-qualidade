import type { Locator, Page } from '@playwright/test';

/** Topo comum a todas as páginas: marca, carrinho e conta do usuário. */
export class Cabecalho {
  readonly navegacao: Locator;
  readonly linkCarrinho: Locator;
  readonly linkEntrar: Locator;
  readonly botaoSair: Locator;

  constructor(page: Page) {
    this.navegacao = page.getByRole('navigation', { name: 'Principal' });
    this.linkCarrinho = this.navegacao.getByRole('link', { name: /Carrinho/ });
    this.linkEntrar = this.navegacao.getByRole('link', { name: 'Entrar' });
    this.botaoSair = this.navegacao.getByRole('button', { name: 'Sair' });
  }

  saudacao(nome: string): Locator {
    return this.navegacao.getByText(`Olá, ${nome}`);
  }

  /** Contador de itens exibido no link do carrinho. */
  quantidadeNoCarrinho(quantidade: number): Locator {
    return this.linkCarrinho.getByLabel(`${quantidade} itens`);
  }

  async sair(): Promise<void> {
    await this.botaoSair.click();
  }
}
