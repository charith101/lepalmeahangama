"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { addShiftNote, deleteShiftNote } from "@/lib/actions/shiftnotes"

type Note = {
  id: string
  content: string
  created_at: string
  profiles: { full_name: string } | null
}

export function ShiftNotes({ notes: initialNotes }: { notes: Note[] }) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [content, setContent] = useState("")
  const [posting, setPosting] = useState(false)

  async function handlePost() {
    if (!content.trim()) return
    setPosting(true)
    const result = await addShiftNote(content.trim())
    if (result.error) {
      toast.error(result.error)
    } else {
      setContent("")
      toast.success("Note added")
      router.refresh()
    }
    setPosting(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteShiftNote(id)
    if (result.error) toast.error(result.error)
    else {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      toast.success("Note deleted")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <MessageSquare className="size-4" />
          Shift Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shift notes yet. Add the first one!</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p>{note.content}</p>
                <p className="text-xs text-muted-foreground">
                  {note.profiles?.full_name ?? "Staff"} &middot;{" "}
                  {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(note.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))
        )}
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost() } }}
          />
          <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()} className="shrink-0 h-8">
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
