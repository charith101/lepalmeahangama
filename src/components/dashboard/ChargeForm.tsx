"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { chargeSchema } from "@/lib/validations"
import { postCharge } from "@/lib/actions/billing"
import type { Database } from "@/lib/supabase/database.types"

const CHARGE_CATEGORIES = ["meal", "late_checkout_fee", "transport", "misc"] as const

type Charge = {
  id: string
  description: string
  category: string
  quantity: number
  unit_price_usd: number
  line_total_usd: number
  created_at: string
}

export function ChargeForm({ bookingId, onSuccess, onCancel }: { bookingId: string; onSuccess: (charge: Charge) => void; onCancel: () => void }) {
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<string | null>("misc")
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const qty = parseFloat(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const lineTotal = qty * price

  async function handleSubmit() {
    const result = chargeSchema.safeParse({
      description, category, quantity: qty, unitPrice: price,
    })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] && !errs[String(issue.path[0])]) {
          errs[String(issue.path[0])] = issue.message
        }
      }
      setFieldErrors(errs)
      return
    }
    setSubmitting(true)
    try {
      const { error } = await postCharge(bookingId, {
        description: description.trim(),
        category: result.data.category as Database["public"]["Enums"]["charge_category"],
        quantity: result.data.quantity,
        unit_price_usd: result.data.unitPrice,
      })
      if (error) throw new Error(error)
      toast.success("Charge added")
      onSuccess({
        id: "",
        description: description.trim(),
        category: result.data.category,
        quantity: result.data.quantity,
        unit_price_usd: result.data.unitPrice,
        line_total_usd: lineTotal,
        created_at: new Date().toISOString(),
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add charge")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">New Charge</p>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => { setDescription(e.target.value); setFieldErrors((p) => ({ ...p, description: "" })) }} placeholder="e.g. Dinner" aria-invalid={!!fieldErrors.description} />
        {fieldErrors.description && <p className="text-sm text-destructive" role="alert">{fieldErrors.description}</p>}
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory} items={CHARGE_CATEGORIES.map((c) => ({ value: c, label: c.replace("_", " ") }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHARGE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input type="number" min="1" step="1" value={quantity} onChange={(e) => { setQuantity(e.target.value); setFieldErrors((p) => ({ ...p, quantity: "" })) }} aria-invalid={!!fieldErrors.quantity} />
          {fieldErrors.quantity && <p className="text-sm text-destructive" role="alert">{fieldErrors.quantity}</p>}
        </div>
        <div className="space-y-2">
          <Label>Unit Price (USD)</Label>
          <Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => { setUnitPrice(e.target.value); setFieldErrors((p) => ({ ...p, unitPrice: "" })) }} placeholder="0.00" aria-invalid={!!fieldErrors.unitPrice} />
          {fieldErrors.unitPrice && <p className="text-sm text-destructive" role="alert">{fieldErrors.unitPrice}</p>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Line total: {formatCurrency(lineTotal)}</p>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving..." : "Save Charge"}</Button>
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
      </div>
    </div>
  )
}
