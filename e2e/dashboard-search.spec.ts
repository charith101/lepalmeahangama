import { test, expect } from "@playwright/test"

test.describe("Dashboard Search & Clock", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
    if (page.url().includes("/auth/login")) {
      await page.getByLabel(/Email/i).fill("test@lepalme.com")
      await page.getByLabel(/Password/i).fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()
      await page.waitForURL(/\/dashboard/)
    }
  })

  test("search opens from the header and accepts input", async ({ page }) => {
    const searchBtn = page.getByRole("button", { name: /Search guests and bookings/i })
    await expect(searchBtn).toBeVisible()
    await searchBtn.click()

    const input = page.getByPlaceholder(/Search guest name/i)
    await expect(input).toBeVisible()
    await input.fill("a")
    await expect(page.getByText(/No results found|Searching/i)).toBeVisible({ timeout: 5000 })
  })

  test("search opens with the keyboard shortcut", async ({ page }) => {
    await page.keyboard.press("Control+K")
    await expect(page.getByPlaceholder(/Search guest name/i)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByPlaceholder(/Search guest name/i)).not.toBeVisible()
  })

  test("header clock is visible", async ({ page }) => {
    await expect(page.locator("header").getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible()
  })
})
