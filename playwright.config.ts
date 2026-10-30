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
  reporter: noCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
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
    // Testes de API não abrem navegador; rodar em cada engine só repetiria o mesmo teste.
    { name: 'api', testMatch: 'api/**' },
    // O axe avalia o DOM e a árvore de acessibilidade; um navegador basta.
    { name: 'a11y', testMatch: 'a11y/**', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run demo',
    url: `http://localhost:${PORTA}/api/saude`,
    env: { PORT: String(PORTA) },
    reuseExistingServer: !noCI,
    timeout: 30_000,
  },
});
