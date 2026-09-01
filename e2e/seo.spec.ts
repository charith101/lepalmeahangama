import { test, expect } from "@playwright/test"

test.describe("SEO — JSON-LD Structured Data", () => {
  test("homepage has Hotel JSON-LD", async ({ page }) => {
    await page.goto("/")
    const jsonld = page.locator('script[type="application/ld+json"]')
    const count = await jsonld.count()
    expect(count).toBeGreaterThanOrEqual(1)

    const text = await jsonld.first().innerText()
    const data = JSON.parse(text)
    expect(data["@type"]).toBe("Hotel")
    expect(data.name).toContain("Le Palme")
  })

  test("room detail page has HotelRoom JSON-LD", async ({ page }) => {
    await page.goto("/rooms/deluxe")
    const jsonld = page.locator('script[type="application/ld+json"]')
    const count = await jsonld.count()
    expect(count).toBeGreaterThanOrEqual(1)

      let hotelRoomFound = false
      for (let i = 0; i < count; i++) {
        const text = await jsonld.nth(i).innerText()
        const data = JSON.parse(text)
        if (data["@type"] === "HotelRoom") {
          hotelRoomFound = true
          expect(data.name).toBeTruthy()
          expect(data.offers).toBeDefined()
          expect(data.offers.priceCurrency).toBe("USD")
          break
        }
      }
      expect(hotelRoomFound).toBe(true)
  })

  test("booking confirmation page has Order JSON-LD", async ({ page }) => {
    const resp = await page.request.get("/booking/confirmation/demo-id")
    if (resp.status() === 200) {
      await page.goto("/booking/confirmation/demo-id")
      const jsonld = page.locator('script[type="application/ld+json"]')
      const count = await jsonld.count()

      for (let i = 0; i < count; i++) {
        const text = await jsonld.nth(i).innerText()
        const data = JSON.parse(text)
        if (data["@type"] === "Order") {
          expect(data.orderNumber).toBeTruthy()
          expect(data.acceptedOffer).toBeDefined()
          break
        }
      }
    }
  })
})

test.describe("SEO — Open Graph & Twitter Meta Tags", () => {
  test("homepage has OG tags", async ({ page }) => {
    await page.goto("/")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute("content", /Le Palme Ahangama/)

    const ogDesc = page.locator('meta[property="og:description"]')
    await expect(ogDesc).toHaveAttribute("content", /Beachfront/)

    const ogType = page.locator('meta[property="og:type"]')
    await expect(ogType).toHaveAttribute("content", "website")
  })

  test("homepage has Twitter card tags", async ({ page }) => {
    await page.goto("/")
    const twitterCard = page.locator('meta[name="twitter:card"]')
    await expect(twitterCard).toHaveAttribute("content", "summary_large_image")

    const twitterTitle = page.locator('meta[name="twitter:title"]')
    await expect(twitterTitle).toHaveAttribute("content", /Le Palme Ahangama/)
  })

  test("rooms page has OG tags", async ({ page }) => {
    await page.goto("/rooms")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute("content", /Rooms/)
  })

  test("about page has OG tags", async ({ page }) => {
    await page.goto("/about")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toBeVisible()
  })

  test("contact page has OG tags", async ({ page }) => {
    await page.goto("/contact")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toBeVisible()
  })

  test("dine page has OG tags", async ({ page }) => {
    await page.goto("/dine")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toBeVisible()
  })

  test("experiences page has OG tags", async ({ page }) => {
    await page.goto("/experiences")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toBeVisible()
  })

  test("room detail page has OG tags", async ({ page }) => {
    await page.goto("/rooms/deluxe")
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toBeVisible()
  })
})

test.describe("SEO — Route Files", () => {
  test("/sitemap.xml returns 200 with valid XML", async ({ page, baseURL }) => {
    const resp = await page.request.get(`${baseURL}/sitemap.xml`)
    expect(resp.status()).toBe(200)
    const text = await resp.text()
    expect(text).toContain("urlset")
    expect(text).toContain("loc")
  })

  test("/robots.txt returns 200 with directives", async ({ page, baseURL }) => {
    const resp = await page.request.get(`${baseURL}/robots.txt`)
    expect(resp.status()).toBe(200)
    const text = await resp.text()
    expect(text).toContain("User-agent")
    expect(text).toContain("Sitemap")
  })
})
