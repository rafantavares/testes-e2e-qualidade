import type { Locator, Page } from '@playwright/test';
import { Cabecalho } from './Cabecalho';

export class LoginPage {
  readonly cabecalho: Cabecalho;
  readonly titulo: Locator;
  readonly campoEmail: Locator;
  readonly campoSenha: Locator;
  readonly botaoEntrar: Locator;
  readonly alerta: Locator;

  constructor(private readonly page: Page) {
    this.cabecalho = new Cabecalho(page);
    this.titulo = page.getByRole('heading', { level: 1, name: 'Entrar' });
    this.campoEmail = page.getByLabel('E-mail');
    this.campoSenha = page.getByLabel('Senha');
    // O cabeçalho também tem um link "Entrar"; o botão do formulário fica no <main>.
    this.botaoEntrar = page.getByRole('main').getByRole('button', { name: 'Entrar' });
    this.alerta = page.getByRole('alert');
  }

  async abrir(destino?: string): Promise<void> {
    await this.page.goto(destino ? `/login?destino=${encodeURIComponent(destino)}` : '/login');
  }

  async entrar(email: string, senha: string): Promise<void> {
    await this.campoEmail.fill(email);
    await this.campoSenha.fill(senha);
    await this.botaoEntrar.click();
  }
}
