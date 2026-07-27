import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

import { OverviewCards } from "@/components/dashboard/OverviewCards"

const defaultProps = {
  arrivals: 5,
  departures: 3,
  occupancy: 78,
  dirtyRooms: 2,
  pendingCheckins: 4,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("OverviewCards", () => {
  it("renders arrival count", () => {
    render(<OverviewCards {...defaultProps} />)
    expect(screen.getByText("Arrivals Today")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("renders departure count", () => {
    render(<OverviewCards {...defaultProps} />)
    expect(screen.getByText("Departures Today")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("renders occupancy percentage", () => {
    render(<OverviewCards {...defaultProps} />)
    expect(screen.getByText("Occupancy")).toBeInTheDocument()
    expect(screen.getByText("78%")).toBeInTheDocument()
  })

  it("renders dirty rooms count", () => {
    render(<OverviewCards {...defaultProps} />)
    expect(screen.getByText("Dirty / Cleaning")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("renders pending check-ins count", () => {
    render(<OverviewCards {...defaultProps} />)
    expect(screen.getByText("Pending Check-ins")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("renders View All button linking to bookings", () => {
    render(<OverviewCards {...defaultProps} />)
    const button = screen.getByText("View All")
    expect(button).toBeInTheDocument()
    const link = button.closest("a")
    expect(link).toHaveAttribute("href", "/dashboard/bookings")
  })

  it("displays correct content with zeroes", () => {
    render(
      <OverviewCards
        arrivals={0}
        departures={0}
        occupancy={0}
        dirtyRooms={0}
        pendingCheckins={0}
      />
    )
    expect(screen.getByText("0%")).toBeInTheDocument()
  })
})
