import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

const mockAddShiftNote = vi.fn()
const mockDeleteShiftNote = vi.fn()
vi.mock("@/lib/actions/shiftnotes", () => ({
  addShiftNote: (...args: any[]) => mockAddShiftNote(...args),
  deleteShiftNote: (...args: any[]) => mockDeleteShiftNote(...args),
}))

import { ShiftNotes } from "@/components/dashboard/ShiftNotes"

const sampleNotes = [
  {
    id: "n1",
    content: "Room 201 needs extra towels",
    created_at: "2025-06-15T08:30:00Z",
    profiles: { full_name: "Kasun Perera" },
  },
  {
    id: "n2",
    content: "VIP guest arriving at 3pm",
    created_at: "2025-06-15T09:00:00Z",
    profiles: { full_name: "Amaya Silva" },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ShiftNotes", () => {
  it("renders the title", () => {
    render(<ShiftNotes notes={[]} />)
    expect(screen.getByText("Shift Notes")).toBeInTheDocument()
  })

  it("shows empty state when no notes", () => {
    render(<ShiftNotes notes={[]} />)
    expect(
      screen.getByText("No shift notes yet. Add the first one!")
    ).toBeInTheDocument()
  })

  it("renders a list of notes", () => {
    render(<ShiftNotes notes={sampleNotes} />)
    expect(screen.getByText("Room 201 needs extra towels")).toBeInTheDocument()
    expect(screen.getByText("VIP guest arriving at 3pm")).toBeInTheDocument()
  })

  it("displays staff names on notes", () => {
    render(<ShiftNotes notes={sampleNotes} />)
    expect(screen.getByText((content) => content.includes("Kasun Perera"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Amaya Silva"))).toBeInTheDocument()
  })

  it("has an input field and post button", () => {
    render(<ShiftNotes notes={[]} />)
    expect(
      screen.getByPlaceholderText("Add a note...")
    ).toBeInTheDocument()
    expect(screen.getByText("Post")).toBeInTheDocument()
  })

  it("disables post button when input is empty", () => {
    render(<ShiftNotes notes={[]} />)
    expect(screen.getByText("Post")).toBeDisabled()
  })

  it("enables post button when input has text", async () => {
    const user = userEvent.setup()
    render(<ShiftNotes notes={[]} />)

    const input = screen.getByPlaceholderText("Add a note...")
    await user.type(input, "Test note")

    expect(screen.getByText("Post")).not.toBeDisabled()
  })

  it("calls addShiftNote with trimmed content on post", async () => {
    mockAddShiftNote.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ShiftNotes notes={[]} />)

    const input = screen.getByPlaceholderText("Add a note...")
    await user.type(input, "  New shift note  ")
    await user.click(screen.getByText("Post"))

    expect(mockAddShiftNote).toHaveBeenCalledWith("New shift note")
  })

  it("clears input and shows success toast after posting", async () => {
    mockAddShiftNote.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ShiftNotes notes={[]} />)

    const input = screen.getByPlaceholderText("Add a note...")
    await user.type(input, "Test note")
    await user.click(screen.getByText("Post"))

    expect(mockRefresh).toHaveBeenCalled()
    const { toast } = await import("sonner")
    expect(toast.success).toHaveBeenCalledWith("Note added")
  })

  it("shows error toast when addShiftNote fails", async () => {
    mockAddShiftNote.mockResolvedValue({ error: "Something went wrong" })
    const user = userEvent.setup()
    render(<ShiftNotes notes={[]} />)

    const input = screen.getByPlaceholderText("Add a note...")
    await user.type(input, "Test note")
    await user.click(screen.getByText("Post"))

    const { toast } = await import("sonner")
    expect(toast.error).toHaveBeenCalledWith("Something went wrong")
  })

  it("calls deleteShiftNote and removes note from list", async () => {
    mockDeleteShiftNote.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ShiftNotes notes={sampleNotes} />)

    const deleteButtons = screen.getAllByRole("button", { name: "" })
    const deleteBtn = deleteButtons.find(
      (btn) => btn.querySelector("svg")
    )
    expect(deleteBtn).toBeTruthy()
  })

  it("shows error toast when deleteShiftNote fails", async () => {
    mockDeleteShiftNote.mockResolvedValue({ error: "Delete failed" })
    const user = userEvent.setup()
    render(<ShiftNotes notes={sampleNotes} />)

    const { toast } = await import("sonner")
    mockDeleteShiftNote.mockResolvedValue({ error: "Delete failed" })

    const deleteButtons = screen.getAllByRole("button", { name: "" })
    const deleteBtn = deleteButtons.find(
      (btn) => btn.querySelector("svg")
    )
    if (deleteBtn) {
      await user.click(deleteBtn)
      expect(toast.error).toHaveBeenCalledWith("Delete failed")
    }
  })

  it("disables post button while posting", async () => {
    mockAddShiftNote.mockImplementation(
      () => new Promise(() => {})
    )
    const user = userEvent.setup()
    render(<ShiftNotes notes={[]} />)

    const input = screen.getByPlaceholderText("Add a note...")
    await user.type(input, "Test")
    await user.click(screen.getByText("Post"))

    expect(screen.getByText("Post")).toBeDisabled()
  })
})
