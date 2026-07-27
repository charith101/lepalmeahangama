import { test, expect } from "@playwright/test"

test.describe("Role-Based Access", () => {
  test.describe("Receptionist", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard")
      if (page.url().includes("/auth/login")) {
        await page.getByLabel(/Email/i).fill("receptionist@lepalme.com")
        await page.getByLabel(/Password/i).fill("password123")
        await page.getByRole("button", { name: /Sign In/i }).click()
        await page.waitForURL(/\/dashboard/)
      }
    })

    test("does not see Admin link in sidebar", async ({ page }) => {
      const adminLink = page.locator("aside a", { hasText: "Admin" })
      await expect(adminLink).toHaveCount(0)
    })

    test("sees Overview, Calendar, Bookings, Guests, Operations links", async ({ page }) => {
      const sidebar = page.locator("aside")
      const expectedLinks = ["Overview", "Calendar", "Bookings", "Guests", "Operations"]
      for (const link of expectedLinks) {
        await expect(sidebar.getByText(link)).toBeVisible()
      }
    })

    test("sees Housekeeping link in sidebar", async ({ page }) => {
      const sidebar = page.locator("aside")
      await expect(sidebar.getByText("Housekeeping")).toBeVisible()
    })

    test("sees Equipment and Transfers links in sidebar", async ({ page }) => {
      const sidebar = page.locator("aside")
      await expect(sidebar.getByText("Equipment")).toBeVisible()
      await expect(sidebar.getByText("Transfers")).toBeVisible()
    })
  })

  test.describe("Housekeeping", () => {
    test("housekeeping user is restricted to housekeeping page", async ({ page }) => {
      await page.goto("/auth/login")
      await page.getByLabel(/Email/i).fill("housekeeping@lepalme.com")
      await page.getByLabel(/Password/i).fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()

      await page.waitForURL(/\/dashboard\/housekeeping/)
      await expect(page).toHaveURL(/\/dashboard\/housekeeping/)
      await expect(page.locator("h1")).toContainText("Housekeeping")
    })

    test("housekeeping sees limited sidebar links", async ({ page }) => {
      await page.goto("/auth/login")
      await page.getByLabel(/Email/i).fill("housekeeping@lepalme.com")
      await page.getByLabel(/Password/i).fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()

      await page.waitForURL(/\/dashboard\/housekeeping/)
      const sidebar = page.locator("aside")
      await expect(sidebar.getByText("Housekeeping")).toBeVisible()
      await expect(sidebar.getByText("Admin")).toHaveCount(0)
      await expect(sidebar.getByText("Bookings")).toHaveCount(0)
    })
  })

  test.describe("Admin", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard")
      if (page.url().includes("/auth/login")) {
        await page.getByLabel(/Email/i).fill("test@lepalme.com")
        await page.getByLabel(/Password/i).fill("password123")
        await page.getByRole("button", { name: /Sign In/i }).click()
        await page.waitForURL(/\/dashboard/)
      }
    })

    test("sees all sidebar links including Admin", async ({ page }) => {
      const sidebar = page.locator("aside")
      const allLinks = ["Overview", "Calendar", "Bookings", "Guests", "Operations", "Housekeeping", "Equipment", "Transfers", "Admin"]
      for (const link of allLinks) {
        await expect(sidebar.getByText(link)).toBeVisible()
      }
    })

    test("admin link navigates to admin page", async ({ page }) => {
      const sidebar = page.locator("aside")
      await sidebar.getByText("Admin").click()
      await page.waitForURL(/\/dashboard\/admin/)
      await expect(page.locator("h1")).toContainText("Admin")
    })
  })
})
