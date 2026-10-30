import { defineConfig, devices } from '@playwright/test';

// Porta própria dos testes, para não colidir com servidores de desenvolvimento na 3000.
const PORTA = Number(process.env.PORT ?? 3100);
const noCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: noCI,
  retries: noCI ? 2 : 0,
  workers: noCI ? 2 : undefined,
  // No CI cada shard gera um relatório "blob"; um job final junta todos em um HTML.
  reporter: noCI
    ? [['list'], ['github'], ['blob']]
    : [['list'], ['html', { open: 'never' }]],
  // A renderização de fontes muda entre sistemas operacionais, então cada SO tem a
  // própria baseline (o CI usa a de Linux, gerada no container oficial do Playwright).
  snapshotPathTemplate: '{testDir}/{testFileDir}/__snapshots__/{arg}-{platform}{ext}',
  expect: {
    toHaveScreenshot: {
      // Tolerância para antialiasing: até 1% dos pixels e diferença de cor de até 20%.
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Araguaina',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Testes de interface: rodam em todos os navegadores.
    { name: 'chromium', testMatch: 'e2e/**', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: 'e2e/**', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: 'e2e/**', use: { ...devices['Desktop Safari'] } },
    // Perfil mobile: viewport pequeno, toque e user agent de celular.
    { name: 'mobile', testMatch: 'e2e/**', use: { ...devices['Pixel 7'] } },
    // Testes de API não abrem navegador; rodar em cada engine só repetiria o mesmo teste.
    { name: 'api', testMatch: 'api/**' },
    // O axe avalia o DOM e a árvore de acessibilidade; um navegador basta.
    { name: 'a11y', testMatch: 'a11y/**', use: { ...devices['Desktop Chrome'] } },
    // Snapshots são comparados pixel a pixel; manter um navegador evita uma baseline por engine.
    { name: 'visual', testMatch: 'visual/**', use: { ...devices['Desktop Chrome'] } },
    // Testes unitários dos scripts de apoio (ex.: cálculo das métricas); não usam navegador.
    { name: 'unidade', testMatch: 'unidade/**' },
  ],
  webServer: {
    command: 'npm run demo',
    url: `http://localhost:${PORTA}/api/saude`,
    env: { PORT: String(PORTA) },
    reuseExistingServer: !noCI,
    timeout: 30_000,
  },
});
