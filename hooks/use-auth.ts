"use client"

import useSWR from "swr"
import { getUser } from "@/lib/auth"

// Fetcher optimisé pour l'auth
async function authFetcher() {
  return await getUser()
}

export function useAuth() {
  const { data: user, error, isLoading, mutate } = useSWR(
    "auth-user",
    authFetcher,
    {
      // ⚡ OPTIMISATION : Cache l'utilisateur pendant toute la session
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Ne revalider que toutes les 5 minutes
      dedupingInterval: 300000,
      // Pas de retry pour l'auth
      shouldRetryOnError: false,
    }
  )

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    mutate,
  }
}
