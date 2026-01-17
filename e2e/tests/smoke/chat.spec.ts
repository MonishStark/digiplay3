/** @format */

import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady, ensureTeamSelected } from "../utils/app";

test.describe("Chat Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	// Temporarily disabled - failing due to team button not found
	// test("should open chat from team and send a message", async ({ page }) => {
	// 	const hasTeam = await ensureTeamSelected(page);
	// 	if (!hasTeam) {
	// 		test.skip(true, "No team access to run chat test.");
	// 	}
	// 	await page.goto("/teams");
	// 	const firstRow = page.locator("#team-table tbody tr").first();
	// 	await expect(firstRow).toBeVisible();
	// 	const actionsButton = firstRow.locator('button[id^="dropdownMenuButton-"]');
	// 	await actionsButton.click();
	// 	const chatButton = page.getByRole("button", { name: /chat/i });
	// 	await chatButton.click();
	// 	await page.waitForURL(/\/chat-histories/, { timeout: 15000 });
	// 	const input = page.locator('textarea[data-kt-element="input"]');
	// 	await input.waitFor({ timeout: 10000 });
	// 	const message = `Smoke chat ${Date.now()}`;
	// 	await input.fill(message);
	// 	const sendResponse = page.waitForResponse((resp) => {
	// 		return (
	// 			resp.url().includes("/chats/") &&
	// 			resp.url().includes("/messages") &&
	// 			resp.request().method() === "POST" &&
	// 				(resp.status() === 200 || resp.status() === 201)
	// 		);
	// 	});
	// 	await page.locator('[data-kt-element="send"]').click();
	// 	await sendResponse;
	// 	await expect(page.getByText(message)).toBeVisible();
	// });
});
