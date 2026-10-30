import type { Locator, Page } from '@playwright/test';
import { Cabecalho } from './Cabecalho';

export type FormaDePagamento = 'Pix' | 'Boleto' | 'Cartão de crédito';

export interface DadosEntrega {
  nome: string;
  cep: string;
  endereco: string;
  pagamento?: FormaDePagamento;
}

export class CheckoutPage {
  readonly cabecalho: Cabecalho;
  readonly titulo: Locator;
  readonly totalAPagar: Locator;
  readonly campoNome: Locator;
  readonly campoCep: Locator;
  readonly campoEndereco: Locator;
  readonly grupoPagamento: Locator;
  readonly botaoConfirmar: Locator;
  readonly alerta: Locator;

  constructor(private readonly page: Page) {
    this.cabecalho = new Cabecalho(page);
    this.titulo = page.getByRole('heading', { level: 1, name: 'Finalizar compra' });
    this.totalAPagar = page.getByText(/^Total a pagar:/);
    this.campoNome = page.getByLabel('Nome completo');
    this.campoCep = page.getByLabel('CEP');
    this.campoEndereco = page.getByLabel('Endereço');
    this.grupoPagamento = page.getByRole('group', { name: 'Forma de pagamento' });
    this.botaoConfirmar = page.getByRole('button', { name: 'Confirmar pedido' });
    this.alerta = page.getByRole('alert');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/checkout');
  }

  async preencher({ nome, cep, endereco, pagamento }: DadosEntrega): Promise<void> {
    await this.campoNome.fill(nome);
    await this.campoCep.fill(cep);
    await this.campoEndereco.fill(endereco);
    if (pagamento) await this.grupoPagamento.getByRole('radio', { name: pagamento }).check();
  }

  async confirmar(): Promise<void> {
    await this.botaoConfirmar.click();
  }
}
