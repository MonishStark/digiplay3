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
		// Navigate to Teams page
		await page.goto("/teams");

		// Open Create Team modal
		await page.getByRole("button", { name: /create team/i }).click();
		await expect(page.locator("#create_team_modal")).toBeVisible();

		// The submit button is disabled until the form is valid.
		await expect(page.locator("#kt_sign_up_submit")).toBeDisabled();

		// Fill team name and alias
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

		await expect(page.locator("#kt_sign_up_submit")).toBeEnabled();
		await page.locator("#kt_sign_up_submit").click();
		await createResponse;
	});
});
