/** @format */

import { test, expect } from "@playwright/test";
import { login, logout } from "../utils/auth";

test.describe("Authentication Smoke Tests", () => {
	test("should allow a user to login with valid credentials", async ({
		page,
	}) => {
		await login(page);
		// Assertion handled within login utility (checking for redirection/absence of Sign In)

		// Additional assertion to confirm we are inside the app
		await expect(page).toHaveURL(/.*(dashboard|teams|admin)/);
	});

	test("should show error message with invalid credentials", async ({
		page,
	}) => {
		await page.goto("/auth/login");

		await page.locator('input[name="email"]').fill("invalid@test.com");
		await page.locator('input[name="password"]').fill("wrongpassword");
		await page.locator('#kt_login_signin_form button[type="submit"]').click();

		await expect(page.locator(".alert-danger")).toContainText(
			"The login details are incorrect"
		);
	});

	test("should allow a user to logout", async ({ page }) => {
		await login(page);
		await logout(page);
		await expect(page).toHaveURL(/.*auth\/login/);
	});

	test("should keep session on reload", async ({ page }) => {
		await login(page);
		await page.reload();
		await expect(page).not.toHaveURL(/\/auth\//);
		await expect(page).toHaveURL(/.*(dashboard|teams|admin)/);
	});
});
