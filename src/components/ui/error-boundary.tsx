"use client"

import { Component, type ReactNode } from "react"

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-500">
          <p className="text-lg font-medium">Something went wrong</p>
          <button
            className="mt-3 text-sm underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
