import { test, expect } from '@playwright/test';

/**
 * Shop smoke: browse → product → add to cart → checkout (COD) → confirmation
 *
 * Selectors are aligned with the real markup (verified against source):
 *  - ProductCard: <Link to="/products/:slug"> wrapping <h3>
 *  - ProductDetail: <button> with text "Add to cart"; onClick calls setOpen(true) which
 *    opens CartDrawer immediately — no need to click the header Cart button.
 *  - CartDrawer: <Link to="/checkout"> with text "Checkout"
 *  - Checkout labels (htmlFor on each InputField): "Full name", "Phone",
 *    "Address line 1", "City", "Governorate"
 *  - Submit: <Button type="submit"> with text "Place Order"
 *  - OrderConfirmation: h1 "Order Confirmed" + order.orderNumber (format: HRC-…)
 */
test('browse → product → cart → checkout (COD) → confirmation', async ({ page }) => {
  // 1. Browse products listing
  await page.goto('/products');

  // 2. Click the first product card link (these go to /products/:slug)
  const firstProductLink = page.locator('a[href^="/products/"]').first();
  await firstProductLink.click();
  await expect(page).toHaveURL(/\/products\//);

  // 3. Add to cart — button text is "Add to cart" (shows "Out of stock" when unavailable)
  const addToCartBtn = page.getByRole('button', { name: /^add to cart$/i });
  await expect(addToCartBtn).toBeVisible();
  await addToCartBtn.click();

  // 4. CartDrawer opens automatically after addItem (setOpen(true) in onClick).
  //    Click the "Checkout" link inside the drawer.
  const checkoutLink = page.getByRole('link', { name: /^checkout$/i });
  await expect(checkoutLink).toBeVisible();
  await checkoutLink.click();

  // 5. Fill checkout form — labels use htmlFor so getByLabel works
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel(/full name/i).fill('Test Buyer');
  await page.getByLabel(/^phone$/i).fill('+201000000000');
  await page.getByLabel(/address line 1/i).fill('1 Test Street');
  await page.getByLabel(/^city$/i).fill('Cairo');
  await page.getByLabel(/governorate/i).fill('Cairo');

  // 6. Submit — button text is "Place Order"
  await page.getByRole('button', { name: /place order/i }).click();

  // 7. Should navigate to /order-confirmation with order in router state
  await expect(page).toHaveURL(/\/order-confirmation/, { timeout: 15_000 });

  // 8. Confirm order number is displayed (format: HRC-<timestamp>-<rand>)
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
  await expect(page.getByText(/HRC-/)).toBeVisible();
});
