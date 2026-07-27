"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginSchema } from "@/lib/validations"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message
        if (issue.path[0] === "password") fieldErrors.password = issue.message
      }
      setFieldErrors(fieldErrors)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password })
    if (error) {
      toast.error("Invalid credentials")
      setLoading(false)
      return
    }
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 p-4" noValidate>
        <h1 className="text-xl font-semibold text-ink dark:text-on-primary">Sign In</h1>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-ink dark:text-on-primary">Email</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })) }}
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && <p id="email-error" className="text-sm text-destructive" role="alert">{fieldErrors.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-ink dark:text-on-primary">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })) }}
            autoComplete="current-password"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && <p id="password-error" className="text-sm text-destructive" role="alert">{fieldErrors.password}</p>}
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </div>
  )
}
