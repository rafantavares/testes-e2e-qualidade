import type { Locator, Page } from '@playwright/test';
import { Cabecalho } from './Cabecalho';

/** Página inicial e página de resultados da busca, que têm a mesma estrutura. */
export class CatalogoPage {
  readonly cabecalho: Cabecalho;
  readonly titulo: Locator;
  readonly campoBusca: Locator;
  readonly botaoBuscar: Locator;
  readonly resumoBusca: Locator;
  readonly produtos: Locator;
  readonly semResultados: Locator;

  constructor(private readonly page: Page) {
    this.cabecalho = new Cabecalho(page);
    this.titulo = page.getByRole('heading', { level: 1 });
    const busca = page.getByRole('search');
    this.campoBusca = busca.getByRole('searchbox', { name: 'Buscar produtos' });
    this.botaoBuscar = busca.getByRole('button', { name: 'Buscar' });
    this.resumoBusca = page.getByRole('status');
    this.produtos = page.getByRole('main').getByRole('listitem');
    this.semResultados = page.getByText('Nenhum produto encontrado.');
  }

  async abrir(): Promise<void> {
    await this.page.goto('/');
  }

  async buscar(termo: string): Promise<void> {
    await this.campoBusca.fill(termo);
    await this.botaoBuscar.click();
  }

  produto(nome: string): Locator {
    return this.produtos.filter({
      has: this.page.getByRole('heading', { name: nome, exact: true }),
    });
  }

  botaoAdicionar(nome: string): Locator {
    return this.produto(nome).getByRole('button', { name: `Adicionar ao carrinho ${nome}` });
  }

  async adicionarAoCarrinho(nome: string): Promise<void> {
    await this.botaoAdicionar(nome).click();
    // O botão envia um formulário (POST + redirecionamento). Sem esperar a página
    // sair do catálogo, um goto() logo em seguida pode cancelar o envio e a
    // adição se perde (aconteceu no WebKit do CI).
    await this.page.waitForURL((url) => url.pathname !== '/' && url.pathname !== '/busca');
  }
}
