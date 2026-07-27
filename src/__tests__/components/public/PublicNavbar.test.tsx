import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockUsePathname = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}))

vi.mock("@/components/ui/animated-theme-toggler", () => ({
  AnimatedThemeToggler: ({ className }: { className?: string }) => (
    <div data-testid="theme-toggler" className={className} />
  ),
}))

import { PublicNavbar } from "@/components/public/PublicNavbar"

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePathname.mockReturnValue("/")
})

describe("PublicNavbar", () => {
  it("renders the logo", () => {
    render(<PublicNavbar />)
    expect(screen.getByText("Le Palme")).toBeInTheDocument()
  })

  it("renders navigation links", () => {
    render(<PublicNavbar />)
    expect(screen.getByText("Stay")).toBeInTheDocument()
    expect(screen.getByText("Dine")).toBeInTheDocument()
    expect(screen.getByText("Experiences")).toBeInTheDocument()
    expect(screen.getByText("About")).toBeInTheDocument()
    expect(screen.getByText("Contact")).toBeInTheDocument()
  })

  it("renders Book Now link", () => {
    render(<PublicNavbar />)
    expect(screen.getByText("Book Now")).toBeInTheDocument()
  })

  it("renders two dark mode togglers (desktop + mobile)", () => {
    render(<PublicNavbar />)
    expect(screen.getAllByTestId("theme-toggler")).toHaveLength(2)
  })

  it("toggles mobile menu on hamburger click", async () => {
    const user = userEvent.setup()
    render(<PublicNavbar />)

    const menuButton = screen.getByLabelText("Open menu")
    expect(menuButton).toBeInTheDocument()

    await user.click(menuButton)

    expect(screen.getByLabelText("Close menu")).toBeInTheDocument()
  })

  it("closes mobile menu when a nav link is clicked", async () => {
    const user = userEvent.setup()
    render(<PublicNavbar />)

    await user.click(screen.getByLabelText("Open menu"))
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument()

    const mobileDine = screen.getAllByText("Dine").slice(-1)[0]
    await user.click(mobileDine)
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument()
  })

  it("hides desktop nav links on dashboard path", () => {
    mockUsePathname.mockReturnValue("/dashboard")
    render(<PublicNavbar />)
    expect(screen.queryByText("Stay")).not.toBeInTheDocument()
  })

  it("links to dashboard root when on dashboard", () => {
    mockUsePathname.mockReturnValue("/dashboard/overview")
    render(<PublicNavbar />)
    const link = screen.getByRole("link", { name: /Le Palme/ })
    expect(link).toHaveAttribute("href", "/dashboard")
  })

  it("links to home when not on dashboard", () => {
    render(<PublicNavbar />)
    const link = screen.getByRole("link", { name: /Le Palme/ })
    expect(link).toHaveAttribute("href", "/")
  })

  it("changes background class on scroll", () => {
    const { container } = render(<PublicNavbar />)
    const nav = container.querySelector("nav")!

    expect(nav.className).toContain("bg-transparent")

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100, writable: true })
      window.dispatchEvent(new Event("scroll", { bubbles: true }))
    })

    expect(nav.className).not.toContain("bg-transparent")
  })
})
