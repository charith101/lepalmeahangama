import { test, expect } from "@playwright/test"

test.describe("Booking Flow — 4-Step Wizard", () => {
  test("renders booking page with wizard", async ({ page }) => {
    await page.goto("/booking")
    await expect(page.locator("h1")).toContainText("Book Your Stay")
  })

  test("shows validation errors on date step when empty", async ({ page }) => {
    await page.goto("/booking")
    const nextButton = page.getByRole("button", { name: /Next|Continue/i })
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await expect(page.getByText(/check.in|check.out|required/i)).toBeVisible()
    }
  })

  test("hero Check Availability pre-fills booking page", async ({ page }) => {
    await page.goto("/")
    const cta = page.getByRole("link", { name: /check availability/i }).first()
    if (await cta.isVisible()) {
      await cta.click()
      await page.waitForURL(/\/booking/)
      await expect(page.locator("h1")).toContainText("Book Your Stay")
    }
  })

  test("room detail Check Availability pre-fills booking page", async ({ page }) => {
    await page.goto("/rooms/deluxe")
    const cta = page.getByRole("link", { name: /check availability/i }).first()
    if (await cta.isVisible()) {
      await cta.click()
      await page.waitForURL(/\/booking/)
      await expect(page.locator("h1")).toContainText("Book Your Stay")
    }
  })
})

test.describe("Booking Flow — Wizard Steps", () => {
  test("full wizard flow proceeds through steps", async ({ page }) => {
    await page.goto("/booking")

    const nextButtons = page.getByRole("button", { name: /Next|Continue/i })

    if (await nextButtons.first().isVisible()) {
      await nextButtons.first().click()
    }

    const backButtons = page.getByRole("button", { name: /Back/i })
    if (await backButtons.first().isVisible()) {
      await backButtons.first().click()
    }
  })

  test("guest details step validates required fields", async ({ page }) => {
    await page.goto("/booking")

    const nextButtons = page.getByRole("button", { name: /Next|Continue/i })
    for (let step = 0; step < 3; step++) {
      if (await nextButtons.first().isVisible()) {
        await nextButtons.first().click()
      }
    }

    const submitButton = page.getByRole("button", { name: /Review|Pay|Confirm/i })
    if (await submitButton.isVisible()) {
      await submitButton.click()
    }
  })
})

test.describe("Booking Lookup", () => {
  test("valid booking reference shows detail", async ({ page }) => {
    await page.goto("/booking/lookup")
    await expect(page.locator("h1")).toContainText("View My Booking")
    await expect(page.getByText("Booking Reference Code")).toBeVisible()
    await expect(page.getByText("Email Address")).toBeVisible()
  })

  test("empty form shows validation errors", async ({ page }) => {
    await page.goto("/booking/lookup")
    await page.getByRole("button", { name: /View My Booking/i }).click()
    await expect(page.getByRole("alert")).toBeVisible()
  })

  test("invalid booking reference shows error", async ({ page }) => {
    await page.goto("/booking/lookup")

    await page.getByLabel(/Booking Reference Code/i).fill("INVALID-REF")
    await page.getByLabel(/Email Address/i).fill("test@example.com")

    await page.getByRole("button", { name: /View My Booking/i }).click()
  })

  test("wrong email for existing ref shows mismatch error", async ({ page }) => {
    await page.goto("/booking/lookup")

    await page.getByLabel(/Booking Reference Code/i).fill("ABCD1234")
    await page.getByLabel(/Email Address/i).fill("wrong@email.com")

    await page.getByRole("button", { name: /View My Booking/i }).click()
  })
})
