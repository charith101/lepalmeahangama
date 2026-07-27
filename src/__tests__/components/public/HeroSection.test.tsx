import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div data-testid="calendar" />,
}))

import { HeroSection } from "@/components/public/HeroSection"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("HeroSection", () => {
  it("renders heading text", () => {
    render(<HeroSection />)
    expect(screen.getByText("Le Palme")).toBeInTheDocument()
    expect(screen.getByText("Ahangama")).toBeInTheDocument()
  })

  it("renders the description text", () => {
    render(<HeroSection />)
    expect(
      screen.getByText(/A beachfront retreat where the reef break meets your doorstep/i)
    ).toBeInTheDocument()
  })

  it("renders Check Availability button", () => {
    render(<HeroSection />)
    expect(screen.getByText("Check Availability")).toBeInTheDocument()
  })

  it("has Arrival label and date input", () => {
    render(<HeroSection />)
    expect(screen.getByText("Arrival")).toBeInTheDocument()
    expect(screen.getAllByText("Select date")).toHaveLength(2)
  })

  it("has Departure label and date input", () => {
    render(<HeroSection />)
    expect(screen.getByText("Departure")).toBeInTheDocument()
  })

  it("has Guests select with default value 2", () => {
    render(<HeroSection />)
    const select = screen.getByRole("combobox")
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue("2")
  })

  it("navigates to /booking on Check Availability click", async () => {
    const user = userEvent.setup()
    render(<HeroSection />)

    await user.click(screen.getByText("Check Availability"))

    expect(mockPush).toHaveBeenCalledWith("/booking?guests=2")
  })

  it("renders Calendar components for date selection", () => {
    render(<HeroSection />)
    const calendars = screen.getAllByTestId("calendar")
    expect(calendars).toHaveLength(2)
  })
})
