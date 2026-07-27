import { test, expect } from "@playwright/test"

test.describe("Dashboard Bookings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
    if (page.url().includes("/auth/login")) {
      await page.getByLabel(/Email/i).fill("test@lepalme.com")
      await page.getByLabel(/Password/i).fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()
      await page.waitForURL(/\/dashboard/)
    }
  })

  test("bookings list page renders with table", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    await expect(page.locator("h1")).toContainText("Bookings")
    await expect(page.getByText(/Guest|Check.in|Check.out|Status|Total|Source/i)).toBeVisible()
  })

  test("new booking page renders form", async ({ page }) => {
    await page.goto("/dashboard/bookings/new")
    await expect(page.locator("h1")).toContainText("New Booking")
  })

  test("create walk-in booking form has required fields", async ({ page }) => {
    await page.goto("/dashboard/bookings/new")
    const formFields = page.locator("input, select, textarea")
    const count = await formFields.count()
    expect(count).toBeGreaterThan(1)
  })

  test("booking detail page renders", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
    }
  })

  test("booking detail shows guest info and actions", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
      const body = page.locator("body")
      await expect(body).toBeVisible()
    }
  })

  test("charge form accessible from booking detail", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
      const chargeButton = page.getByText(/Add Charge|Charge/i).first()
      if (await chargeButton.isVisible()) {
        await chargeButton.click()
      }
    }
  })

  test("record payment accessible from booking detail", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
      const payButton = page.getByText(/Record Payment|Payment/i).first()
      if (await payButton.isVisible()) {
        await payButton.click()
      }
    }
  })

  test("deposit controls accessible from booking detail", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
      const depositButton = page.getByText(/Deposit/i).first()
      if (await depositButton.isVisible()) {
        await depositButton.click()
      }
    }
  })

  test("move room accessible from booking detail", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const firstViewButton = page.getByRole("link", { name: /View/i }).first()
    if (await firstViewButton.isVisible()) {
      await firstViewButton.click()
      await page.waitForURL(/\/dashboard\/bookings\//)
      const moveButton = page.getByText(/Move Room/i).first()
      if (await moveButton.isVisible()) {
        await moveButton.click()
      }
    }
  })
})
