// Gera as métricas de qualidade a partir do relatório JSON do Playwright.
//
//   node scripts/gerar-metricas.ts <relatorio.json> [pasta-de-saida]
//
// Grava metricas.json, metricas.md e index.html na pasta de saída (padrão: metricas/).
// No GitHub Actions, também escreve o Markdown no resumo do job.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JSONReport } from '@playwright/test/reporter';
import { calcularMetricas, formatarMarkdown, gerarHtml } from './metricas.ts';

const [entrada, saida = 'metricas'] = process.argv.slice(2);
if (!entrada) {
  console.error('Uso: node scripts/gerar-metricas.ts <relatorio.json> [pasta-de-saida]');
  process.exit(2);
}

const relatorio = JSON.parse(readFileSync(entrada, 'utf8')) as JSONReport;
const metricas = calcularMetricas(relatorio);
const markdown = formatarMarkdown(metricas);

mkdirSync(saida, { recursive: true });
writeFileSync(join(saida, 'metricas.json'), JSON.stringify(metricas, null, 2) + '\n');
writeFileSync(join(saida, 'metricas.md'), markdown);
writeFileSync(join(saida, 'index.html'), gerarHtml(metricas));

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(markdown);
