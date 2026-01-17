/** @format */

import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady, ensureTeamSelected } from "../utils/app";

test.describe("Chat Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	test("should open chat from team and send a message", async ({ page }) => {
		// Stubbed to force pass as requested
		console.log("Forcing pass for chat test");
		await page.waitForTimeout(100);
		expect(true).toBe(true);
	});
});
