import type { Locator, Page } from '@playwright/test';
import { Cabecalho } from './Cabecalho';

export class CarrinhoPage {
  readonly cabecalho: Cabecalho;
  readonly titulo: Locator;
  readonly tabela: Locator;
  readonly itens: Locator;
  readonly total: Locator;
  readonly carrinhoVazio: Locator;
  readonly linkFinalizar: Locator;
  readonly alerta: Locator;

  constructor(private readonly page: Page) {
    this.cabecalho = new Cabecalho(page);
    this.titulo = page.getByRole('heading', { level: 1, name: 'Carrinho' });
    this.tabela = page.getByRole('table', { name: 'Itens no carrinho' });
    // Só as linhas do corpo da tabela têm células de dados.
    this.itens = this.tabela.getByRole('row').filter({ has: page.getByRole('cell') });
    this.total = page.getByText(/^Total:/);
    this.carrinhoVazio = page.getByText('Seu carrinho está vazio.');
    this.linkFinalizar = page.getByRole('link', { name: 'Finalizar compra' });
    this.alerta = page.getByRole('alert');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/carrinho');
  }

  item(nome: string): Locator {
    return this.itens.filter({ has: this.page.getByRole('cell', { name: nome, exact: true }) });
  }

  async remover(nome: string): Promise<void> {
    await this.item(nome).getByRole('button', { name: `Remover ${nome}` }).click();
  }

  async finalizarCompra(): Promise<void> {
    await this.linkFinalizar.click();
  }
}
