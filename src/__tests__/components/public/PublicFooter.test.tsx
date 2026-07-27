import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

import { PublicFooter } from "@/components/public/PublicFooter"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PublicFooter", () => {
  it("renders the brand name", () => {
    render(<PublicFooter />)
    expect(screen.getByText("Le Palme")).toBeInTheDocument()
  })

  it("renders contact column with address", () => {
    render(<PublicFooter />)
    const headings = screen.getAllByText("Contact")
    expect(headings.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Ahangama Beach Road/)).toBeInTheDocument()
    expect(screen.getByText(/Ahangama, Sri Lanka/)).toBeInTheDocument()
  })

  it("renders phone number", () => {
    render(<PublicFooter />)
    expect(screen.getByText(/\+94-XXX-XXXXXX/)).toBeInTheDocument()
  })

  it("renders email address", () => {
    render(<PublicFooter />)
    const email = screen.getByText("info@lepalmeahangama.com")
    expect(email).toBeInTheDocument()
    expect(email).toHaveAttribute("href", "mailto:info@lepalmeahangama.com")
  })

  it("renders navigation links in About column", () => {
    render(<PublicFooter />)
    expect(screen.getByText("Rooms")).toBeInTheDocument()
    expect(screen.getByText("Experiences")).toBeInTheDocument()
    expect(screen.getAllByText("Contact").length).toBeGreaterThanOrEqual(1)
  })

  it("renders About navigation links with correct hrefs", () => {
    render(<PublicFooter />)
    expect(screen.getByText("Rooms").closest("a")).toHaveAttribute("href", "/rooms")
    expect(screen.getByText("Experiences").closest("a")).toHaveAttribute("href", "/experiences")
  })

  it("renders social media links", () => {
    render(<PublicFooter />)
    expect(screen.getByText("IG")).toBeInTheDocument()
    expect(screen.getByText("FB")).toBeInTheDocument()
    expect(screen.getByText("TA")).toBeInTheDocument()
  })

  it("renders Careers section", () => {
    render(<PublicFooter />)
    expect(screen.getByText("Careers")).toBeInTheDocument()
    expect(screen.getByText("Work With Us")).toBeInTheDocument()
    expect(screen.getByText("Join Our Team")).toBeInTheDocument()
  })

  it("renders the copyright year", () => {
    render(<PublicFooter />)
    expect(screen.getByText(/Le Palme Ahangama\. All rights reserved/)).toBeInTheDocument()
  })
})
