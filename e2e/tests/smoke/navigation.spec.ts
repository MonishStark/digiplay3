/** @format */

import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady, ensureTeamSelected } from "../utils/app";

test.describe("Navigation Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	// Note: Adjust URL patterns based on actual app routing

	test("should load app data without console errors", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		const appDataResponse = page.waitForResponse((resp) => {
			return resp.url().includes("/app-data") && resp.status() === 200;
		});

		await page.goto("/dashboard");
		await appDataResponse;
		expect(consoleErrors).toEqual([]);
	});

	test("should navigate to Dashboard", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page).toHaveURL(/.*dashboard/);
	});

	test("should navigate to Teams", async ({ page }) => {
		await page.goto("/teams");
		await expect(page).toHaveURL(/.*teams/);
	});

	test("should navigate to Files", async ({ page }) => {
		const hasTeam = await ensureTeamSelected(page);
		if (!hasTeam) {
			test.skip(true, "No team access to run files navigation test.");
		}

		await page.goto("/files");
		await expect(page).toHaveURL(/.*files/);
	});

	test("should navigate to Notifications", async ({ page }) => {
		await page.goto("/notifications");
		await expect(page).toHaveURL(/.*notifications/);
	});

	test("should navigate to User Account", async ({ page }) => {
		await page.goto("/user");
		await expect(page).toHaveURL(/.*user/);
	});

	test("should navigate to Company Profile", async ({ page }) => {
		await page.goto("/company");
		await expect(page).toHaveURL(/.*company/);
	});

	test("should navigate to Manage Users", async ({ page }) => {
		await page.goto("/manage-users");
		if (page.url().includes("/error/500")) {
			test.skip(true, "Manage Users requires admin role.");
		}
		await expect(page).toHaveURL(/.*manage-users/);
	});

	test("should navigate to Invite Users", async ({ page }) => {
		await page.goto("/invite-users");
		if (page.url().includes("/error/500")) {
			test.skip(true, "Invite Users requires admin role.");
		}
		await expect(page).toHaveURL(/.*invite-users/);
	});
});
