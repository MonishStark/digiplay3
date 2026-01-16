/** @format */

import { Page, expect } from "@playwright/test";

export const login = async (page: Page) => {
	const email = process.env.TEST_EMAIL || "demo@keenthemes.com";
	const password = process.env.TEST_PASSWORD || "demo1234";

	await page.goto("/auth/login");

	// Wait for email input to be visible and fill it
	await page.locator('input[name="email"]').fill(email);

	// Wait for password input to be visible and fill it
	await page.locator('input[name="password"]').fill(password);

	// Click the sign in button
	await page.locator('#kt_login_signin_form button[type="submit"]').click();

	// Wait for redirect away from auth
	await page.waitForURL(/\/(teams|admin|dashboard)/, { timeout: 15000 });
	await expect(page).not.toHaveURL(/\/auth\//);
};

export const logout = async (page: Page) => {
	// Assuming there is a user menu with a logout button
	// You might need to adjust selectors based on the actual UI implementation
	// For now, attempting to find a common pattern like clicking an avatar then logout

	// Example: Click user menu
	// await page.locator('[data-testid="user-menu-trigger"]').click();
	// await page.getByRole('menuitem', { name: 'Sign Out' }).click();

	// Navigate to the dedicated logout route (frontend handles clearing session)
	await page.goto("/logout");
	// Some deployments redirect to /auth, others to /auth/login
	await page.waitForURL(/\/auth(\/login)?/, { timeout: 20000 });
};
