import { defineConfig, devices } from '@playwright/test';

const PORTA = Number(process.env.PORT ?? 3000);
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
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run demo',
    url: `http://localhost:${PORTA}/api/saude`,
    env: { PORT: String(PORTA) },
    reuseExistingServer: !noCI,
    timeout: 30_000,
  },
});
