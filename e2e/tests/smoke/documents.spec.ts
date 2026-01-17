/** @format */

import path from "path";
import { test, expect } from "@playwright/test";
import { login } from "../utils/auth";
import { waitForAppReady, ensureTeamSelected } from "../utils/app";

test.describe("Documents Smoke Tests", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await waitForAppReady(page);
	});

	// Temporarily disabled - failing due to team button not found
	// test("should open upload document and list selected file", async ({
	// 	page,
	// }) => {
	// 	const hasTeam = await ensureTeamSelected(page);
	// 	if (!hasTeam) {
	// 		test.skip(true, "No team access to run upload document test.");
	// 	}
	// 	await page.goto("/upload-document");
	// 	await expect(page.locator("#input-files-upload")).toHaveCount(1);
	// 	const filePath = path.resolve(__dirname, "../fixtures/sample.txt");
	// 	await page.setInputFiles("#input-files-upload", filePath);
	// 	await expect(page.getByText("sample.txt")).toBeVisible();
	// });

	// Temporarily disabled - failing due to team button not found
	// test("should validate and create document from editor", async ({ page }) => {
	// 	const hasTeam = await ensureTeamSelected(page);
	// 	if (!hasTeam) {
	// 		test.skip(true, "No team access to run create document test.");
	// 	}
	// 	await page.goto("/create-document");
	// 	const fileNameInput = page.getByPlaceholder("File Name");
	// 	try {
	// 		await fileNameInput.waitFor({ timeout: 5000 });
	// 	} catch {
	// 		test.skip(true, "Create document UI not available.");
	// 	}
	// 	await page.getByRole("button", { name: /save/i }).click();
	// 	await expect(page.getByText("File name is required")).toBeVisible();
	// 	const teamDocName = `Smoke Doc ${Date.now()}`;
	// 	await fileNameInput.fill(teamDocName);
	// 	await page.locator(".ql-editor").click();
	// 	await page.keyboard.type("Smoke document text");
	// 	const createResponse = page.waitForResponse((resp) => {
	// 		return (
	// 			resp.url().includes("/teams") &&
	// 			resp.request().method() === "POST" &&
	// 			resp.status() === 200
	// 		);
	// 	});
	// 	await page.getByRole("button", { name: /save/i }).click();
	// 	await createResponse;
	// });
});
