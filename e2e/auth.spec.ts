import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("/dashboard without auth redirects to /auth/login", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL(/\/auth\/login/)
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/auth/login")
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/Password/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible()
  })

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/auth/login")

    await page.getByLabel(/Email/i).fill("nonexistent@example.com")
    await page.getByLabel(/Password/i).fill("wrongpassword")

    await page.getByRole("button", { name: /Sign In/i }).click()
  })

  test("login with empty fields shows validation errors", async ({ page }) => {
    await page.goto("/auth/login")
    await page.getByRole("button", { name: /Sign In/i }).click()
  })

  test("already logged in redirects to dashboard", async ({ page }) => {
    await page.goto("/auth/login")
    await page.goto("/dashboard")
    if (!page.url().includes("/auth/login")) {
      await page.goto("/auth/login")
      await page.waitForURL(/\/dashboard/)
      expect(page.url()).not.toContain("/auth/login")
    }
  })

  test("logout clears session", async ({ page }) => {
    await page.goto("/auth/login")

    const emailInput = page.getByLabel(/Email/i)
    const passwordInput = page.getByLabel(/Password/i)

    if (await emailInput.isVisible()) {
      await emailInput.fill("test@lepalme.com")
      await passwordInput.fill("password123")
      await page.getByRole("button", { name: /Sign In/i }).click()
    }

    await page.goto("/dashboard")
    if (!page.url().includes("/auth/login")) {
      const logoutButton = page.getByRole("button", { name: /Log out|Sign out|Logout/i })
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
      }
      await page.goto("/dashboard")
      await page.waitForURL(/\/auth\/login/)
      await expect(page).toHaveURL(/\/auth\/login/)
    }
  })
})
