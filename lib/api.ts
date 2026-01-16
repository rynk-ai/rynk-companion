import { useState, useEffect } from "react"

export const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:8788"

export type User = {
  id: string
  name?: string
  email?: string
  image?: string
  credits: number
}

export type Session = {
  user: User
  expires: string
}

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          "Content-Type": "application/json"
        },
      })
      
      const data = await res.json()
      if (Object.keys(data).length > 0 && data.user) {
        setSession(data)
      } else {
        setSession(null)
      }
    } catch (e) {
      console.error("Auth check failed:", e)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkSession()
  }, [])

  return { session, loading, checkSession }
}
