import { test, expect } from '@playwright/test';

/**
 * Admin smoke: login → admin surface loads → products page visible
 *
 * Selectors aligned with real markup:
 *  - Login.tsx: <label> wrapping <span>Email/Password</span> + <input> — getByLabel works
 *    because the input is a descendant of the label element.
 *  - Sign-in button text: "Sign in" (busy state shows "Signing in…")
 *  - After successful admin login, navigate() goes to /admin (per login handler: user.role === 'admin')
 *  - AdminProducts.tsx list view: <h1> with text "Products"
 *
 * Seed creds: admin@herencia.example / admin1234
 * Minimal: assert the admin surface loads + products heading visible.
 * Full form create-product is brittle and out of scope here.
 */
test('admin login → admin surface loads → products page visible', async ({ page }) => {
  // 1. Navigate to login
  await page.goto('/login');

  // 2. Fill credentials — Login.tsx wraps each input in a <label> with a <span> for text
  await page.getByLabel(/email/i).fill('admin@herencia.example');
  await page.getByLabel(/password/i).fill('admin1234');

  // 3. Submit
  await page.getByRole('button', { name: /sign in/i }).click();

  // 4. Admin role redirects to /admin
  await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });

  // 5. Verify the products admin page renders the heading
  await page.goto('/admin/products');
  await expect(page.getByRole('heading', { name: /^products$/i })).toBeVisible();
});
