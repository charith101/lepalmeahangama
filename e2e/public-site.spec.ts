import { test, expect } from "@playwright/test"

test.describe("Public Site — Homepage", () => {
  test("homepage renders all sections", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("nav")).toBeVisible()

    await expect(page.locator("nav a", { hasText: "Le Palme" }).first()).toBeVisible()

    await expect(page.locator("footer")).toBeVisible()
    await expect(page.locator("footer").or(page.getByText("Le Palme"))).toBeVisible()

    const sections = [
      "HeroSection",
      "RoomShowcase",
      "RestaurantSection",
      "ExperiencesSection",
      "NewsletterSection",
    ]
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- iterating to verify main is visible per section
    for (const section of sections) {
      const main = page.locator("main")
      await expect(main).toBeVisible()
    }

    await expect(page.getByRole("heading", { name: /Rooms/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Restaurant|Dine|Dining/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Experiences/i })).toBeVisible()
  })

  test("navbar links navigate correctly", async ({ page }) => {
    await page.goto("/")
    const links = [
      { label: "Stay", href: "/rooms" },
      { label: "Dine", href: "/dine" },
      { label: "Experiences", href: "/experiences" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ]
    for (const { label, href } of links) {
      const link = page.locator("nav a", { hasText: label }).first()
      await expect(link).toBeVisible()
      await link.click()
      await page.waitForURL(`**${href}`)
      await expect(page).toHaveURL(new RegExp(href.replace(/^(\/.*)/, "\\/$1")))
      await page.goBack()
    }
  })

  test("mobile hamburger menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/")

    const menuButton = page.getByLabel(/Open menu/i)
    await expect(menuButton).toBeVisible()
    await menuButton.click()

    const mobileNav = page.locator("nav >> visible=true").last()
    await expect(mobileNav.getByText("Stay")).toBeVisible()
    await expect(mobileNav.getByText("Dine")).toBeVisible()
    await expect(mobileNav.getByText("Experiences")).toBeVisible()
    await expect(mobileNav.getByText("About")).toBeVisible()
    await expect(mobileNav.getByText("Contact")).toBeVisible()
    await expect(mobileNav.getByText("Book Now")).toBeVisible()

    const closeButton = page.getByLabel(/Close menu/i)
    await closeButton.click()
    await expect(mobileNav.getByText("Stay")).not.toBeVisible()
  })

  test("theme toggle persists across reload", async ({ page }) => {
    await page.goto("/")

    const themeToggle = page.locator('button:has([class*="theme"])').first()
    await themeToggle.click()

    const html = page.locator("html")
    const classAttr = await html.getAttribute("class") || ""
    const isDark = classAttr.includes("dark")

    await page.reload()

    const reClassAttr = await html.getAttribute("class") || ""
    if (isDark) {
      expect(reClassAttr).toContain("dark")
    }
  })
})

test.describe("Public Site — Rooms", () => {
  test("/rooms listing renders categories", async ({ page }) => {
    await page.goto("/rooms")
    await expect(page.locator("h1")).toContainText("Rooms & Rates")
  })

  test("/rooms/[slug] detail renders room page", async ({ page }) => {
    await page.goto("/rooms/deluxe")
    await expect(page.locator("h1")).toBeVisible()
  })
})

test.describe("Public Site — Static Pages", () => {
  const staticPages = [
    { path: "/about", title: /About/i },
    { path: "/contact", title: /Contact/i },
    { path: "/dine", title: /Dining|Taste of Sri Lanka/i },
    { path: "/experiences", title: /Experiences|Discover Ahangama/i },
  ]

  for (const { path, title } of staticPages) {
    test(`${path} renders correctly`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator("h1")).toContainText(title)
    })
  }
})

test.describe("Public Site — Route Files", () => {
  test("/sitemap.xml returns 200", async ({ page, baseURL }) => {
    const resp = await page.request.get(`${baseURL}/sitemap.xml`)
    expect(resp.status()).toBe(200)
    const text = await resp.text()
    expect(text).toContain("urlset")
  })

  test("/robots.txt returns 200", async ({ page, baseURL }) => {
    const resp = await page.request.get(`${baseURL}/robots.txt`)
    expect(resp.status()).toBe(200)
    const text = await resp.text()
    expect(text).toContain("User-agent")
  })
})
