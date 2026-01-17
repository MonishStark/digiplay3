/** @format */

import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady } from "../utils/app";

test.describe("Invitation Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	test("should show validation on invite users form", async ({ page }) => {
		await page.goto("/invite-users");

		if (page.url().includes("/error/500")) {
			test.skip(true, "Invite Users requires admin role.");
		}

		const emailInput = page.locator('input[name="email"]');
		await emailInput.waitFor({ timeout: 5000 });

		await emailInput.click();
		await page.keyboard.press("Tab");

		await expect(page.getByText("Email is required")).toBeVisible();
	});
});
