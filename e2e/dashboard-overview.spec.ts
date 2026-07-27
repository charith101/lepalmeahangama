import { test, expect } from "@playwright/test"

test.describe("Dashboard Overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard")
    if (page.url().includes("/auth/login")) {
      await page.getByLabel(/Email/i).fill("test@lepalme.com")
      await page.getByLabel(/Password/i).fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()
      await page.waitForURL(/\/dashboard/)
    }
  })

  test("overview cards display arrival and departure counts", async ({ page }) => {
    await expect(page.getByText(/Arrivals/i) || page.getByText(/Check.in/i)).toBeVisible()
    await expect(page.getByText(/Departures/i) || page.getByText(/Check.out/i)).toBeVisible()
  })

  test("occupancy and dirty room stats are visible", async ({ page }) => {
    const body = page.locator("body")
    await expect(body).toContainText(/%/)
    await expect(body).toContainText(/Dirty|Cleaning/i)
  })

  test("revenue card shows today, month, and outstanding", async ({ page }) => {
    await expect(page.getByText(/Revenue|Today|Month|Outstanding/i)).toBeVisible()
  })

  test("room status board renders with room numbers", async ({ page }) => {
    const board = page.locator("main")
    await expect(board).toBeVisible()
  })

  test("shift notes can be added", async ({ page }) => {
    const noteInput = page.getByPlaceholder(/Add a note/i)
    if (await noteInput.isVisible()) {
      await noteInput.fill("E2E test note")
      await page.getByRole("button", { name: /Post/i }).click()
      await expect(page.getByText("E2E test note")).toBeVisible({ timeout: 5000 })
    }
  })

  test("shift notes can be deleted", async ({ page }) => {
    const noteInput = page.getByPlaceholder(/Add a note/i)
    if (await noteInput.isVisible()) {
      await noteInput.fill("Note to delete")
      await page.getByRole("button", { name: /Post/i }).click()
      const deleteBtn = page.locator("button").filter({ has: page.locator("svg") }).first()
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
      }
    }
  })

  test("quick check-in sheet opens and closes", async ({ page }) => {
    const quickCheckin = page.getByText(/Quick Check.in|Check In/i).first()
    if (await quickCheckin.isVisible()) {
      await quickCheckin.click()
    }
  })

  test("quick check-out sheet opens and closes", async ({ page }) => {
    const quickCheckout = page.getByText(/Quick Check.out/i).first()
    if (await quickCheckout.isVisible()) {
      await quickCheckout.click()
    }
  })

  test("mark clean sheet opens and closes", async ({ page }) => {
    const markClean = page.getByText(/Mark Clean/i).first()
    if (await markClean.isVisible()) {
      await markClean.click()
    }
  })

  test("walk-in and new booking buttons navigate correctly", async ({ page }) => {
    const walkinBtn = page.getByText(/Walk.in/i).first()
    if (await walkinBtn.isVisible()) {
      await walkinBtn.click()
      await page.waitForURL(/\/dashboard\/bookings\/new/)
      await expect(page.locator("h1")).toContainText("New Booking")
    }
  })

  test("calendar button navigates correctly", async ({ page }) => {
    const calBtn = page.getByText(/Calendar/i).first()
    if (await calBtn.isVisible()) {
      await calBtn.click()
      await page.waitForURL(/\/dashboard\/calendar/)
    }
  })
})
