import { expect, test } from '@playwright/test';

test('a página inicial carrega o catálogo', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Loja Demo/);
  await expect(page.getByRole('heading', { level: 1, name: 'Produtos' })).toBeVisible();
});
