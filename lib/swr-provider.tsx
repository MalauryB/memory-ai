"use client"

import { SWRConfig } from "swr"
import { ReactNode } from "react"

// Fetcher optimisé pour les requêtes JSON
async function fetcher(url: string) {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error("Erreur lors de la récupération des données")
    throw error
  }

  return res.json()
}

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // Cache pendant 5 minutes
        dedupingInterval: 5000,
        // Réessayer en cas d'erreur
        shouldRetryOnError: true,
        errorRetryCount: 3,
        // Revalider au focus de la fenêtre
        revalidateOnFocus: true,
        // Revalider à la reconnexion
        revalidateOnReconnect: true,
        // Ne pas revalider au montage si les données sont fraîches
        revalidateIfStale: false,
        // Garder les données en cache pendant 30 secondes
        focusThrottleInterval: 30000,
      }}
    >
      {children}
    </SWRConfig>
  )
}
