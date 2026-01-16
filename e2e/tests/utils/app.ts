/** @format */

import { Page, expect } from "@playwright/test";

export const waitForAppReady = async (page: Page) => {
	// Wait for the main layout to be visible
	// Adjust selector based on the actual main layout element (e.g., sidebar, topbar)
	await expect(page.locator("#root")).toBeVisible();

	// Optionally wait for a sidebar or header
	// await expect(page.locator('.app-sidebar')).toBeVisible();
};

export const ensureTeamSelected = async (page: Page): Promise<boolean> => {
	await page.goto("/teams");

	if (page.url().includes("/error/")) {
		return false;
	}

	await expect(page.locator("#team-table")).toBeVisible();

	const rows = page.locator("#team-table tbody tr");
	if ((await rows.count()) === 0) {
		await page.getByRole("button", { name: /create team/i }).click();
		await expect(page.locator("#create_team_modal")).toBeVisible();

		const teamName = `Smoke Test Team ${Date.now()}`;
		const teamAlias = `smoke-${Date.now()}`;

		await page.locator('input[name="teamName"]').fill(teamName);
		await page.locator('input[name="teamAlias"]').fill(teamAlias);

		const createResponse = page.waitForResponse((resp) => {
			return (
				resp.url().includes("/teams") &&
				resp.request().method() === "POST" &&
				(resp.status() === 200 || resp.status() === 201)
			);
		});

		const submitButton = page.locator("#kt_sign_up_submit");
		await expect(submitButton).toBeEnabled({ timeout: 20000 });
		await submitButton.click();
		await createResponse;
		await expect(page.locator("#create_team_modal")).toBeHidden({ timeout: 20000 });
	}

	await expect(rows.first()).toBeVisible({ timeout: 20000 });
	await rows.first().locator("td").first().click();
	await page.waitForURL(/\/files/, { timeout: 15000 });

	return true;
};
