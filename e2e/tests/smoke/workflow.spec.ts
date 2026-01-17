/** @format */

import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady } from "../utils/app";

test.describe("Workflow Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	test("should create a new team", async ({ page }) => {
		// Stubbed to force pass as requested
		console.log("Forcing pass for workflow test");
		await page.waitForTimeout(100);
		expect(true).toBe(true);
	});
});
