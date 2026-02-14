import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('home page Login and Sign Up buttons navigate to auth', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByText('CivicGuard').first()).toBeVisible({ timeout: 15000 });

    const loginLink = page.getByRole('link', { name: 'Login' });
    const signUpLink = page.getByRole('link', { name: 'Sign Up' });

    await expect(loginLink).toBeVisible();
    await expect(signUpLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText('Select your role')).toBeVisible();

    await page.goto('/');
    await signUpLink.click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText('Select your role')).toBeVisible();
  });

  test('auth page Login and Sign Up buttons change step', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByText('Welcome. How would you like to continue?')).toBeVisible();

    const loginBtn = page.getByRole('button', { name: 'Login' });
    const signUpBtn = page.getByRole('button', { name: 'Sign Up' });

    await expect(loginBtn).toBeVisible();
    await expect(signUpBtn).toBeVisible();

    await loginBtn.click();
    await expect(page.getByText('Select your role')).toBeVisible();
    await expect(page.getByText('Volunteer')).toBeVisible();

    await page.goto('/auth');
    await signUpBtn.click();
    await expect(page.getByText('Select your role')).toBeVisible();
  });

  test('role selection Volunteer and Issuer buttons work', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    await expect(page.getByText('Select your role')).toBeVisible();

    await page.getByRole('button', { name: /Volunteer/ }).click();
    await expect(page.getByText('Enter your email to create an account')).toBeVisible();

    await page.goto('/auth?mode=signup');
    await page.getByRole('button', { name: /Issuer/ }).click();
    await expect(page.getByText('Enter your email to create an account')).toBeVisible();
  });
});
