import { expect, test } from '@playwright/test';
import type { JSONReport, JSONReportSpec, JSONReportSuite, JSONReportTest } from '@playwright/test/reporter';
import {
  calcularMetricas,
  coberturaDoRisco,
  formatarDuracao,
  formatarMarkdown,
  gerarHtml,
  listarTestes,
  type Risco,
} from '../../scripts/metricas';

// Monta só os campos do relatório JSON que o cálculo usa.
function execucao(projeto: string, status: JSONReportTest['status'], duracoes: number[]): JSONReportTest {
  return {
    projectName: projeto,
    projectId: projeto,
    status,
    results: duracoes.map((duration) => ({ duration })),
  } as unknown as JSONReportTest;
}

function spec(file: string, title: string, tests: JSONReportTest[]): JSONReportSpec {
  return { file, title, tests } as unknown as JSONReportSpec;
}

function suite(title: string, specs: JSONReportSpec[], suites: JSONReportSuite[] = []): JSONReportSuite {
  return { title, file: specs[0]?.file ?? '', specs, suites } as unknown as JSONReportSuite;
}

function relatorio(suites: JSONReportSuite[], projetos = ['chromium', 'firefox', 'api']): JSONReport {
  return {
    config: { projects: projetos.map((name) => ({ name })) },
    suites,
    errors: [],
    stats: { startTime: '2026-10-30T12:00:00.000Z', duration: 65_000, expected: 0, unexpected: 0, flaky: 0, skipped: 0 },
  } as unknown as JSONReport;
}

const exemplo = relatorio([
  suite('e2e/checkout.spec.ts', [], [
    suite('Finalizar compra', [
      spec('e2e/checkout.spec.ts', 'conclui o pedido', [
        execucao('firefox', 'expected', [900]),
        execucao('chromium', 'flaky', [1200, 800]),
      ]),
    ]),
  ]),
  suite('api/pedidos.spec.ts', [
    spec('api/pedidos.spec.ts', 'cria pedido', [execucao('api', 'expected', [50])]),
    spec('api/pedidos.spec.ts', 'rejeita carrinho vazio', [execucao('api', 'unexpected', [30, 30, 30])]),
    spec('api/pedidos.spec.ts', 'ainda não implementado', [execucao('api', 'skipped', [])]),
  ]),
]);

test.describe('Métricas de qualidade', () => {
  test('lista cada execução com título completo, projeto e duração somada', () => {
    const testes = listarTestes(exemplo);

    expect(testes).toHaveLength(5);
    expect(testes[1]).toEqual({
      arquivo: 'e2e/checkout.spec.ts',
      titulo: 'Finalizar compra › conclui o pedido',
      projeto: 'chromium',
      status: 'flaky',
      duracao: 2000,
      tentativas: 2,
    });
  });

  test('conta status e calcula taxas sobre os testes executados', () => {
    const m = calcularMetricas(exemplo, []);

    expect(m.totais).toEqual({ testes: 5, passou: 2, falhou: 1, flaky: 1, pulado: 1 });
    // Pulados ficam fora do denominador: 4 executados.
    expect(m.taxaFlaky).toBe(0.25);
    expect(m.taxaSucesso).toBe(0.75);
    expect(m.duracaoTotal).toBe(65_000);
    expect(m.flaky.map((t) => t.titulo)).toEqual(['Finalizar compra › conclui o pedido']);
    expect(m.falhas.map((t) => t.titulo)).toEqual(['rejeita carrinho vazio']);
  });

  test('agrupa por projeto na ordem do playwright.config.ts', () => {
    const m = calcularMetricas(exemplo, []);

    expect(m.projetos).toEqual([
      { projeto: 'chromium', testes: 1, falhas: 0, flaky: 1, duracao: 2000 },
      { projeto: 'firefox', testes: 1, falhas: 0, flaky: 0, duracao: 900 },
      { projeto: 'api', testes: 3, falhas: 1, flaky: 0, duracao: 140 },
    ]);
  });

  test('ordena os mais lentos pela soma das tentativas', () => {
    const m = calcularMetricas(exemplo, []);

    expect(m.maisLentos.map((t) => `${t.projeto} ${t.duracao}`)).toEqual([
      'chromium 2000',
      'firefox 900',
      'api 90',
      'api 50',
      'api 0',
    ]);
  });

  test.describe('cobertura de riscos', () => {
    const testes = listarTestes(exemplo);
    const risco = (criterio: Risco['criterio']): Risco => ({ id: 'RX', descricao: 'teste', prioridade: 4, criterio });

    test('risco cujos testes passaram fica ok', () => {
      const r = coberturaDoRisco(risco({ arquivos: ['e2e/checkout.spec.ts'], projetos: ['firefox'] }), testes);
      expect(r).toMatchObject({ testes: 1, situacao: 'ok' });
    });

    test('falha prevalece sobre flaky e pulados não contam', () => {
      const r = coberturaDoRisco(risco({ arquivos: ['api/'] }), testes);
      expect(r).toMatchObject({ testes: 2, situacao: 'falhou' });
    });

    test('teste que só passou no retry deixa o risco como flaky', () => {
      const r = coberturaDoRisco(risco({ arquivos: ['e2e/'] }), testes);
      expect(r.situacao).toBe('flaky');
    });

    test('filtra pelo título do teste', () => {
      const r = coberturaDoRisco(risco({ titulo: /carrinho vazio/ }), testes);
      expect(r).toMatchObject({ testes: 1, situacao: 'falhou' });
    });

    test('risco sem nenhum teste executado fica descoberto', () => {
      const r = coberturaDoRisco(risco({ arquivos: ['a11y/'] }), testes);
      expect(r).toMatchObject({ testes: 0, situacao: 'sem testes' });
    });

    test('projeto da matriz que não rodou deixa o risco incompleto', () => {
      const r = coberturaDoRisco(risco({ arquivos: ['e2e/'], projetos: ['firefox', 'webkit'] }), testes);
      expect(r).toMatchObject({ testes: 1, situacao: 'incompleto' });
    });

    test('critério de saída 4 olha só riscos de prioridade 4 ou mais', () => {
      const baixo: Risco = { id: 'R8', descricao: 'baixo', prioridade: 2, criterio: { arquivos: ['a11y/'] } };
      const alto: Risco = { id: 'R1', descricao: 'alto', prioridade: 6, criterio: { arquivos: ['e2e/'], projetos: ['firefox'] } };

      expect(calcularMetricas(exemplo, [baixo, alto]).riscosPrioritariosCobertos).toBe(true);
      expect(calcularMetricas(exemplo, [{ ...baixo, prioridade: 4 }, alto]).riscosPrioritariosCobertos).toBe(false);
    });
  });

  test('formata durações em ms, segundos e minutos', () => {
    expect(formatarDuracao(450)).toBe('450 ms');
    expect(formatarDuracao(12_340)).toBe('12,3 s');
    expect(formatarDuracao(125_000)).toBe('2 min 05 s');
  });

  test('o resumo em Markdown traz totais, riscos, flaky e falhas', () => {
    const md = formatarMarkdown(calcularMetricas(exemplo));

    expect(md).toContain('| 5 | 2 | 1 | 1 | 1 | 75,0% | 25,0% | 1 min 05 s |');
    expect(md).toContain('| R1 | Cliente não consegue finalizar a compra | 6 | 4 | ❌ falhou |');
    expect(md).toContain('**Atenção:**');
    expect(md).toContain('### Testes que só passaram no retry');
    expect(md).toContain('- `api/pedidos.spec.ts` rejeita carrinho vazio (api)');
  });

  test('a página HTML escapa títulos de teste', () => {
    const comHtml = relatorio([
      suite('e2e/x.spec.ts', [spec('e2e/x.spec.ts', 'mostra <script>alert(1)</script>', [execucao('chromium', 'unexpected', [10])])]),
    ]);
    const html = gerarHtml(calcularMetricas(comHtml));

    expect(html).toContain('mostra &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});
