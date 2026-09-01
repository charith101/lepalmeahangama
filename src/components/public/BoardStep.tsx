"use client"

import { useState } from "react"
import { BOARD_PLANS, type BoardPlan } from "@/lib/constants"
import { cn, formatCurrency } from "@/lib/utils"

type BoardStepProps = {
  initialPlan: BoardPlan
  nights: number
  totalRooms: number
  onChange?: (plan: BoardPlan) => void
  onNext: (plan: BoardPlan) => void
  onBack: () => void
}

export function BoardStep({ initialPlan, nights, totalRooms, onChange, onNext, onBack }: BoardStepProps) {
  const [selected, setSelected] = useState<BoardPlan>(initialPlan)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-serif font-normal text-stone-900 dark:text-stone-100 mb-1">Choose a Board Plan</h2>
        <p className="text-sm font-sans text-stone-500 dark:text-stone-400">
          Applied to all {totalRooms} room{totalRooms > 1 ? "s" : ""} &middot; {nights} night{nights > 1 ? "s" : ""}.
        </p>
      </div>

      <div className="space-y-3">
        {BOARD_PLANS.map((plan) => {
          const isSelected = plan.key === selected
          const total = plan.pricePerNight * nights * totalRooms
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => { setSelected(plan.key); onChange?.(plan.key) }}
              className={cn(
                "w-full text-left border p-4 transition-colors",
                isSelected
                  ? "border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800/50"
                  : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-sans font-medium text-stone-900 dark:text-stone-100">{plan.label}</p>
                  <p className="text-xs font-sans text-stone-500 dark:text-stone-400 mt-0.5">{plan.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-sans font-semibold text-stone-900 dark:text-stone-100">
                    {plan.pricePerNight > 0 ? `+${formatCurrency(plan.pricePerNight)}` : "Included"}
                  </p>
                  <p className="text-xs font-sans text-stone-500 dark:text-stone-400">per room &middot; night</p>
                </div>
              </div>
              {total > 0 && (
                <p className="text-xs font-sans text-stone-500 dark:text-stone-400 mt-2">
                  {formatCurrency(total)} for {totalRooms} room{totalRooms > 1 ? "s" : ""} &times; {nights} night{nights > 1 ? "s" : ""}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex-1 py-2.5 border border-stone-200 dark:border-stone-800 text-sm font-sans font-medium text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">Back</button>
        <button type="button" onClick={() => onNext(selected)} className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-sans font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">Next: Extras</button>
      </div>
    </div>
  )
}