import type { Locator, Page } from '@playwright/test';
import { Cabecalho } from './Cabecalho';

export class PedidoPage {
  readonly cabecalho: Cabecalho;
  readonly titulo: Locator;
  readonly confirmacao: Locator;
  readonly numeroPedido: Locator;
  readonly total: Locator;

  constructor(page: Page) {
    this.cabecalho = new Cabecalho(page);
    this.titulo = page.getByRole('heading', { level: 1, name: 'Pedido confirmado' });
    this.confirmacao = page.getByRole('status');
    this.numeroPedido = this.confirmacao.getByText(/^nº \d+$/);
    this.total = page.getByText(/^Total:/);
  }
}
