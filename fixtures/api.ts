import { expect as baseExpect, test as base, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { ValidateFunction } from 'ajv';
import { clientes } from './dados';
import { obterToken } from './test';

/** Tempo máximo aceito por requisição. Folgado para não ficar instável em runners compartilhados do CI. */
export const LIMITE_RESPOSTA_MS = Number(process.env.LIMITE_RESPOSTA_MS ?? 500);

export interface Resposta {
  resposta: APIResponse;
  corpo: unknown;
  duracaoMs: number;
}

type Cliente = (typeof clientes)[keyof typeof clientes];

/** Cliente HTTP fino que mede o tempo de cada chamada e envia o token, se houver. */
export class ClienteApi {
  constructor(
    private readonly request: APIRequestContext,
    readonly token?: string,
  ) {}

  get(caminho: string): Promise<Resposta> {
    return this.enviar('GET', caminho);
  }

  post(caminho: string, dados?: unknown): Promise<Resposta> {
    return this.enviar('POST', caminho, dados);
  }

  delete(caminho: string): Promise<Resposta> {
    return this.enviar('DELETE', caminho);
  }

  /** Envia um corpo cru, para testar JSON malformado. */
  postTexto(caminho: string, texto: string): Promise<Resposta> {
    return this.enviar('POST', caminho, undefined, texto);
  }

  private async enviar(method: string, caminho: string, dados?: unknown, texto?: string): Promise<Resposta> {
    const inicio = performance.now();
    const resposta = await this.request.fetch(caminho, {
      method,
      data: texto ?? dados,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    const duracaoMs = performance.now() - inicio;
    const corpo: unknown = await resposta.json();
    return { resposta, corpo, duracaoMs };
  }
}

interface FixturesApi {
  /** Requisições sem autenticação. */
  anonimo: ClienteApi;
  /** Cliente autenticado com sessão (e carrinho) nova em cada teste. */
  api: ClienteApi;
  entrarNaApi: (cliente: Cliente) => Promise<ClienteApi>;
}

export const test = base.extend<FixturesApi>({
  anonimo: async ({ request }, use) => use(new ClienteApi(request)),
  api: async ({ request }, use) => use(new ClienteApi(request, await obterToken(request))),
  entrarNaApi: async ({ request }, use) =>
    use(async (cliente) => new ClienteApi(request, await obterToken(request, cliente))),
});

export const expect = baseExpect.extend({
  /** Valida o corpo contra um JSON Schema compilado pelo Ajv. */
  toMatchSchema(corpo: unknown, validar: ValidateFunction) {
    const pass = validar(corpo);
    const detalhes = (validar.errors ?? [])
      .map((e) => `  ${e.instancePath || '(raiz)'} ${e.message ?? ''}`)
      .join('\n');
    return {
      pass,
      name: 'toMatchSchema',
      message: () =>
        pass
          ? 'Esperava que o corpo NÃO seguisse o schema.'
          : `O corpo não segue o schema:\n${detalhes}\n\nCorpo recebido:\n${JSON.stringify(corpo, null, 2)}`,
    };
  },

  /** Verifica status HTTP e tempo de resposta de uma vez, com mensagem clara. */
  toResponder({ resposta, duracaoMs }: Resposta, status: number) {
    const statusOk = resposta.status() === status;
    const tempoOk = duracaoMs <= LIMITE_RESPOSTA_MS;
    const pass = statusOk && tempoOk;
    return {
      pass,
      name: 'toResponder',
      message: () =>
        [
          `${resposta.url()}`,
          `  status: esperado ${status}, recebido ${resposta.status()}`,
          `  tempo: ${duracaoMs.toFixed(0)} ms (limite ${LIMITE_RESPOSTA_MS} ms)`,
        ].join('\n'),
    };
  },
});
