// Cálculo das métricas de qualidade a partir do relatório JSON do Playwright.
// Só funções puras: quem lê e grava arquivos é `gerar-metricas.ts`.
import type { JSONReport, JSONReportSuite, JSONReportTest } from '@playwright/test/reporter';

export type Situacao = 'ok' | 'falhou' | 'flaky' | 'incompleto' | 'sem testes';

/** Como um risco do plano de testes é ligado aos testes que o cobrem. */
export interface CriterioRisco {
  /** Prefixos de arquivo relativos a `tests/` (ex.: `e2e/checkout.spec.ts`, `api/`). Vazio = todos. */
  arquivos?: string[];
  /** Só testes cujo título casa com a expressão. */
  titulo?: RegExp;
  /** Projetos considerados; cada um precisa ter ao menos um teste executado. */
  projetos?: string[];
}

export interface Risco {
  id: string;
  descricao: string;
  prioridade: number;
  criterio: CriterioRisco;
}

// Espelha as seções 3 e 9 do plano de testes (docs/plano-de-testes.md).
export const RISCOS: Risco[] = [
  { id: 'R1', descricao: 'Cliente não consegue finalizar a compra', prioridade: 6, criterio: { arquivos: ['e2e/checkout.spec.ts', 'api/pedidos.spec.ts'] } },
  { id: 'R2', descricao: 'Total do carrinho/pedido calculado errado', prioridade: 6, criterio: { arquivos: ['e2e/checkout.spec.ts', 'api/pedidos.spec.ts'] } },
  { id: 'R3', descricao: 'Login quebra ou aceita credencial inválida', prioridade: 3, criterio: { arquivos: ['e2e/login.spec.ts', 'api/login.spec.ts'] } },
  { id: 'R4', descricao: 'Busca não encontra produtos existentes', prioridade: 4, criterio: { arquivos: ['e2e/busca.spec.ts', 'api/produtos.spec.ts'] } },
  { id: 'R5', descricao: 'Venda de produto esgotado ou acima do estoque', prioridade: 4, criterio: { arquivos: ['e2e/carrinho.spec.ts', 'api/carrinho.spec.ts'] } },
  { id: 'R6', descricao: 'Mudança de contrato da API quebra clientes', prioridade: 4, criterio: { arquivos: ['api/'] } },
  { id: 'R7', descricao: 'Página inacessível para leitores de tela/teclado', prioridade: 4, criterio: { arquivos: ['a11y/'] } },
  { id: 'R8', descricao: 'Quebra de layout não percebida', prioridade: 2, criterio: { arquivos: ['visual/', 'e2e/carrinho.spec.ts'], titulo: /regressão visual|rola na horizontal/i } },
  { id: 'R9', descricao: 'Funciona em um navegador e falha em outro', prioridade: 2, criterio: { arquivos: ['e2e/'], projetos: ['chromium', 'firefox', 'webkit', 'mobile'] } },
  // A suíte inteira: o risco se materializa quando qualquer teste só passa no retry.
  { id: 'R10', descricao: 'Testes instáveis (flaky) minam a confiança na suíte', prioridade: 4, criterio: {} },
];

export interface TesteExecutado {
  arquivo: string;
  /** Título completo, com os `describe` (ex.: "Carrinho › remove um produto"). */
  titulo: string;
  projeto: string;
  status: JSONReportTest['status'];
  /** Soma das tentativas, em ms. */
  duracao: number;
  tentativas: number;
}

export interface MetricasProjeto {
  projeto: string;
  testes: number;
  falhas: number;
  flaky: number;
  duracao: number;
}

export interface CoberturaRisco {
  id: string;
  descricao: string;
  prioridade: number;
  testes: number;
  situacao: Situacao;
}

export interface Metricas {
  geradoEm: string;
  inicio: string;
  /** Duração da execução (relógio), em ms. */
  duracaoTotal: number;
  totais: { testes: number; passou: number; falhou: number; flaky: number; pulado: number };
  /** Testes que só passaram no retry, sobre os executados (0 a 1). */
  taxaFlaky: number;
  /** Testes que passaram de primeira ou no retry, sobre os executados (0 a 1). */
  taxaSucesso: number;
  projetos: MetricasProjeto[];
  maisLentos: TesteExecutado[];
  flaky: TesteExecutado[];
  falhas: TesteExecutado[];
  riscos: CoberturaRisco[];
  /** Critério de saída 4: todo risco com prioridade ≥ 4 tem testes e todos passaram. */
  riscosPrioritariosCobertos: boolean;
}

/** Achata as suítes aninhadas do relatório em uma lista de execuções (teste × projeto). */
export function listarTestes(relatorio: JSONReport): TesteExecutado[] {
  const testes: TesteExecutado[] = [];
  const visitar = (suite: JSONReportSuite, caminho: string[]) => {
    for (const spec of suite.specs) {
      for (const teste of spec.tests) {
        testes.push({
          arquivo: spec.file,
          titulo: [...caminho, spec.title].join(' › '),
          projeto: teste.projectName,
          status: teste.status,
          duracao: teste.results.reduce((soma, r) => soma + r.duration, 0),
          tentativas: teste.results.length,
        });
      }
    }
    for (const filha of suite.suites ?? []) visitar(filha, [...caminho, filha.title]);
  };
  // A suíte de primeiro nível é o arquivo; o título dela não entra no nome do teste.
  for (const suite of relatorio.suites) visitar(suite, []);
  return testes;
}

function situacaoDe(testes: TesteExecutado[]): Situacao {
  const executados = testes.filter((t) => t.status !== 'skipped');
  if (executados.length === 0) return 'sem testes';
  if (executados.some((t) => t.status === 'unexpected')) return 'falhou';
  if (executados.some((t) => t.status === 'flaky')) return 'flaky';
  return 'ok';
}

export function coberturaDoRisco(risco: Risco, testes: TesteExecutado[]): CoberturaRisco {
  const { arquivos, titulo, projetos } = risco.criterio;
  const cobrem = testes.filter(
    (t) =>
      (!arquivos?.length || arquivos.some((a) => t.arquivo.startsWith(a))) &&
      (!titulo || titulo.test(t.titulo)) &&
      (!projetos || projetos.includes(t.projeto)),
  );
  let situacao = situacaoDe(cobrem);
  // Um projeto da matriz que não rodou deixa o risco incompleto, mesmo que os outros passem.
  const faltaProjeto = projetos?.some((p) => !cobrem.some((t) => t.projeto === p && t.status !== 'skipped'));
  if (faltaProjeto && (situacao === 'ok' || situacao === 'flaky')) situacao = 'incompleto';
  return {
    id: risco.id,
    descricao: risco.descricao,
    prioridade: risco.prioridade,
    testes: cobrem.filter((t) => t.status !== 'skipped').length,
    situacao,
  };
}

export function calcularMetricas(relatorio: JSONReport, riscos: Risco[] = RISCOS, agora = new Date()): Metricas {
  const testes = listarTestes(relatorio);
  const contar = (status: TesteExecutado['status']) => testes.filter((t) => t.status === status).length;
  const totais = {
    testes: testes.length,
    passou: contar('expected'),
    falhou: contar('unexpected'),
    flaky: contar('flaky'),
    pulado: contar('skipped'),
  };
  const executados = totais.testes - totais.pulado;

  const porProjeto = new Map<string, MetricasProjeto>();
  for (const t of testes) {
    const p = porProjeto.get(t.projeto) ?? { projeto: t.projeto, testes: 0, falhas: 0, flaky: 0, duracao: 0 };
    p.testes += 1;
    p.falhas += t.status === 'unexpected' ? 1 : 0;
    p.flaky += t.status === 'flaky' ? 1 : 0;
    p.duracao += t.duracao;
    porProjeto.set(t.projeto, p);
  }
  // Mantém a ordem dos projetos no playwright.config.ts.
  const ordem = relatorio.config.projects.map((p) => p.name);
  const projetos = [...porProjeto.values()].sort((a, b) => ordem.indexOf(a.projeto) - ordem.indexOf(b.projeto));

  const cobertura = riscos.map((r) => coberturaDoRisco(r, testes));

  return {
    geradoEm: agora.toISOString(),
    inicio: relatorio.stats.startTime,
    duracaoTotal: relatorio.stats.duration,
    totais,
    taxaFlaky: executados ? totais.flaky / executados : 0,
    taxaSucesso: executados ? (totais.passou + totais.flaky) / executados : 0,
    projetos,
    maisLentos: [...testes].sort((a, b) => b.duracao - a.duracao).slice(0, 5),
    flaky: testes.filter((t) => t.status === 'flaky'),
    falhas: testes.filter((t) => t.status === 'unexpected'),
    riscos: cobertura,
    riscosPrioritariosCobertos: cobertura.filter((r) => r.prioridade >= 4).every((r) => r.situacao === 'ok'),
  };
}

// ---------------------------------------------------------------------------
// Formatação

export function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`;
  const min = Math.floor(s / 60);
  return `${min} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
}

export function formatarPercentual(fracao: number): string {
  return `${(fracao * 100).toFixed(1).replace('.', ',')}%`;
}

const ICONE: Record<Situacao, string> = { ok: '✅', falhou: '❌', flaky: '⚠️', incompleto: '⛔', 'sem testes': '⛔' };

const escaparTabela = (texto: string) => texto.replaceAll('|', '\\|');

export function formatarMarkdown(m: Metricas): string {
  const { totais } = m;
  const linhas = [
    '## Métricas de qualidade',
    '',
    `| Testes | ✅ Passou | ❌ Falhou | ⚠️ Flaky | ⏭️ Pulado | Sucesso | Taxa de flaky | Duração |`,
    `|---:|---:|---:|---:|---:|---:|---:|---:|`,
    `| ${totais.testes} | ${totais.passou} | ${totais.falhou} | ${totais.flaky} | ${totais.pulado} | ${formatarPercentual(m.taxaSucesso)} | ${formatarPercentual(m.taxaFlaky)} | ${formatarDuracao(m.duracaoTotal)} |`,
    '',
    '### Por projeto',
    '',
    '| Projeto | Testes | Falhas | Flaky | Tempo somado |',
    '|---|---:|---:|---:|---:|',
    ...m.projetos.map((p) => `| ${p.projeto} | ${p.testes} | ${p.falhas} | ${p.flaky} | ${formatarDuracao(p.duracao)} |`),
    '',
    '### Cobertura dos riscos do plano de testes',
    '',
    m.riscosPrioritariosCobertos
      ? 'Todos os riscos de prioridade ≥ 4 têm testes e todos passaram (critério de saída 4).'
      : '**Atenção:** há risco de prioridade ≥ 4 sem testes passando (critério de saída 4).',
    '',
    '| Risco | Descrição | Prioridade | Testes | Situação |',
    '|---|---|---:|---:|---|',
    ...m.riscos.map((r) => `| ${r.id} | ${r.descricao} | ${r.prioridade} | ${r.testes} | ${ICONE[r.situacao]} ${r.situacao} |`),
    '',
    '### Testes mais lentos',
    '',
    '| Teste | Projeto | Duração |',
    '|---|---|---:|',
    ...m.maisLentos.map((t) => `| \`${t.arquivo}\` ${escaparTabela(t.titulo)} | ${t.projeto} | ${formatarDuracao(t.duracao)} |`),
  ];
  if (m.flaky.length) {
    linhas.push('', '### Testes que só passaram no retry', '', 'Pelo critério de saída 5, cada um merece uma issue de investigação.', '');
    linhas.push(...m.flaky.map((t) => `- \`${t.arquivo}\` ${t.titulo} (${t.projeto}, ${t.tentativas} tentativas)`));
  }
  if (m.falhas.length) {
    linhas.push('', '### Falhas', '');
    linhas.push(...m.falhas.map((t) => `- \`${t.arquivo}\` ${t.titulo} (${t.projeto})`));
  }
  return linhas.join('\n') + '\n';
}

const escaparHtml = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export function gerarHtml(m: Metricas): string {
  const { totais } = m;
  const cartao = (rotulo: string, valor: string, classe = '') =>
    `<div class="cartao ${classe}"><span class="valor">${escaparHtml(valor)}</span><span class="rotulo">${escaparHtml(rotulo)}</span></div>`;
  const tabela = (cabecalho: string[], linhas: string[][], numericas: number[] = []) =>
    `<div class="rolagem"><table><thead><tr>${cabecalho
      .map((c, i) => `<th${numericas.includes(i) ? ' class="num"' : ''}>${escaparHtml(c)}</th>`)
      .join('')}</tr></thead><tbody>${linhas
      .map((l) => `<tr>${l.map((c, i) => `<td${numericas.includes(i) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  const situacao = (s: Situacao) => `<span class="situacao ${s.replace(' ', '-')}">${ICONE[s]} ${s}</span>`;
  const teste = (t: TesteExecutado) => `<code>${escaparHtml(t.arquivo)}</code> ${escaparHtml(t.titulo)}`;
  const listaTestes = (titulo: string, testes: TesteExecutado[]) =>
    testes.length
      ? `<h2>${titulo}</h2><ul>${testes.map((t) => `<li>${teste(t)} <small>(${escaparHtml(t.projeto)})</small></li>`).join('')}</ul>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Métricas de qualidade</title>
<style>
  :root { --fundo: #fff; --texto: #1f2328; --suave: #59636e; --borda: #d1d9e0; --ok: #1a7f37; --erro: #cf222e; --alerta: #9a6700; }
  @media (prefers-color-scheme: dark) {
    :root { --fundo: #0d1117; --texto: #e6edf3; --suave: #9198a1; --borda: #3d444d; --ok: #3fb950; --erro: #f85149; --alerta: #d29922; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px 48px; background: var(--fundo); color: var(--texto); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 960px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 1.6rem; }
  h2 { margin: 32px 0 12px; font-size: 1.15rem; }
  .meta { color: var(--suave); margin: 0 0 24px; }
  a { color: inherit; }
  .cartoes { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
  .cartao { border: 1px solid var(--borda); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; }
  .cartao .valor { font-size: 1.5rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .cartao .rotulo { color: var(--suave); font-size: .85rem; }
  .cartao.ok .valor, .situacao.ok { color: var(--ok); }
  .cartao.erro .valor, .situacao.falhou, .situacao.incompleto, .situacao.sem-testes { color: var(--erro); }
  .cartao.alerta .valor, .situacao.flaky { color: var(--alerta); }
  .rolagem { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--borda); vertical-align: top; }
  th { color: var(--suave); font-weight: 600; font-size: .85rem; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  code { font-size: .85em; }
  .aviso { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--borda); }
</style>
</head>
<body>
<main>
<h1>Métricas de qualidade</h1>
<p class="meta">Execução iniciada em ${escaparHtml(new Date(m.inicio).toLocaleString('pt-BR', { timeZone: 'America/Araguaina' }))} · <a href="../">relatório completo do Playwright</a> · <a href="metricas.json">metricas.json</a></p>
<div class="cartoes">
${cartao('testes', String(totais.testes))}
${cartao('passaram', String(totais.passou), 'ok')}
${cartao('falharam', String(totais.falhou), totais.falhou ? 'erro' : '')}
${cartao('flaky', String(totais.flaky), totais.flaky ? 'alerta' : '')}
${cartao('taxa de sucesso', formatarPercentual(m.taxaSucesso), m.taxaSucesso === 1 ? 'ok' : 'erro')}
${cartao('taxa de flaky', formatarPercentual(m.taxaFlaky), m.taxaFlaky ? 'alerta' : '')}
${cartao('duração', formatarDuracao(m.duracaoTotal))}
</div>
<h2>Cobertura dos riscos do plano de testes</h2>
<p class="aviso">${
    m.riscosPrioritariosCobertos
      ? '✅ Todos os riscos de prioridade ≥ 4 têm testes e todos passaram (critério de saída 4).'
      : '❌ Há risco de prioridade ≥ 4 sem testes passando (critério de saída 4).'
  }</p>
${tabela(
  ['Risco', 'Descrição', 'Prioridade', 'Testes', 'Situação'],
  m.riscos.map((r) => [r.id, escaparHtml(r.descricao), String(r.prioridade), String(r.testes), situacao(r.situacao)]),
  [2, 3],
)}
<h2>Por projeto</h2>
${tabela(
  ['Projeto', 'Testes', 'Falhas', 'Flaky', 'Tempo somado'],
  m.projetos.map((p) => [escaparHtml(p.projeto), String(p.testes), String(p.falhas), String(p.flaky), formatarDuracao(p.duracao)]),
  [1, 2, 3, 4],
)}
<h2>Testes mais lentos</h2>
${tabela(
  ['Teste', 'Projeto', 'Duração'],
  m.maisLentos.map((t) => [teste(t), escaparHtml(t.projeto), formatarDuracao(t.duracao)]),
  [2],
)}
${listaTestes('Testes que só passaram no retry', m.flaky)}
${listaTestes('Falhas', m.falhas)}
</main>
</body>
</html>
`;
}
