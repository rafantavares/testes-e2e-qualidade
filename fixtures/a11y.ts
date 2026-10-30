import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

/** Regras WCAG avaliadas: 2.0 e 2.1, níveis A e AA. */
export const TAGS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Impactos que reprovam o teste. Moderados e menores viram anotação no relatório. */
export const IMPACTOS_BLOQUEANTES = ['critical', 'serious'];

export interface Violacao {
  regra: string;
  impacto: string;
  descricao: string;
  ajuda: string;
  elementos: string[];
}

/**
 * Roda o axe na página atual, anexa o resultado completo ao relatório e
 * devolve só as violações bloqueantes, num formato fácil de ler na falha.
 */
export async function analisarAcessibilidade(page: Page, testInfo: TestInfo): Promise<Violacao[]> {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS_WCAG).analyze();

  await testInfo.attach('axe-resultado.json', {
    body: JSON.stringify(resultado, null, 2),
    contentType: 'application/json',
  });

  const violacoes = resultado.violations.map((v) => ({
    regra: v.id,
    impacto: v.impact ?? 'desconhecido',
    descricao: v.help,
    ajuda: v.helpUrl,
    elementos: v.nodes.map((n) => n.target.join(' ')),
  }));

  for (const v of violacoes.filter((v) => !IMPACTOS_BLOQUEANTES.includes(v.impacto))) {
    testInfo.annotations.push({ type: `a11y ${v.impacto}`, description: `${v.regra}: ${v.descricao}` });
  }

  return violacoes.filter((v) => IMPACTOS_BLOQUEANTES.includes(v.impacto));
}
