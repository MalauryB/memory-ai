/**
 * Server-side Validation Schemas
 *
 * Tous les schémas de validation Zod pour les API routes.
 * TOUJOURS valider côté serveur, jamais se fier uniquement à la validation client.
 */

import { z } from 'zod'

// ==================== PROJETS ====================

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Le titre est requis')
    .max(200, 'Le titre ne peut pas dépasser 200 caractères')
    .trim(),
  description: z
    .string()
    .max(5000, 'La description ne peut pas dépasser 5000 caractères')
    .optional(),
  category: z
    .string()
    .max(100, 'La catégorie ne peut pas dépasser 100 caractères')
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional()
    .nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .optional()
    .nullable(),
  imageUrl: z
    .string()
    .url('URL d\'image invalide')
    .max(500, 'L\'URL ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
  steps: z
    .array(
      z.object({
        title: z.string().min(1, 'Le titre de l\'étape est requis').max(200),
        description: z.string().max(2000).optional(),
        estimatedDuration: z.string().max(50).optional(),
      })
    )
    .max(50, 'Maximum 50 étapes par projet')
    .optional()
    .default([]),
})

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
})

// ==================== ÉTAPES ====================

export const createStepSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200).trim(),
  description: z.string().max(2000).optional(),
  estimatedDuration: z.string().max(50).optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export const updateStepSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  estimatedDuration: z.string().max(50).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  orderIndex: z.number().int().min(0).optional(),
})

// ==================== SOUS-ÉTAPES ====================

export const createSubstepsSchema = z.object({
  substeps: z
    .array(
      z.object({
        title: z.string().min(1, 'Le titre est requis').max(200).trim(),
        description: z.string().max(1000).optional(),
        estimatedDuration: z.string().max(50).optional(),
      })
    )
    .min(1, 'Au moins une sous-étape requise')
    .max(30, 'Maximum 30 sous-étapes'),
})

export const updateSubstepSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  estimatedDuration: z.string().max(50).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

// ==================== TRACKERS ====================

export const createTrackerSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(200).trim(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  frequency: z.enum(['daily', 'weekly', 'every_x_days', 'custom']),
  frequencyValue: z.number().int().min(1).max(365).optional(),
  projectId: z.string().uuid('ID de projet invalide').optional().nullable(),
})

export const updateTrackerSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  frequency: z.enum(['daily', 'weekly', 'every_x_days', 'custom']).optional(),
  frequencyValue: z.number().int().min(1).max(365).optional(),
  isActive: z.boolean().optional(),
})

// ==================== GÉNÉRATION IA ====================

export const generateStepsSchema = z.object({
  title: z.string().min(1, 'Le titre du projet est requis').max(200),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(5000),
  category: z.string().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const generateSubstepsSchema = z.object({
  stepTitle: z.string().min(1, 'Le titre de l\'étape est requis').max(200),
  stepDescription: z.string().max(2000).optional(),
  projectTitle: z.string().min(1).max(200),
  projectCategory: z.string().max(100).optional(),
})

export const aiChatSchema = z.object({
  message: z
    .string()
    .min(1, 'Le message ne peut pas être vide')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères')
    .trim(),
  conversationId: z.string().uuid().optional(),
})

// ==================== COMPTE ====================

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100).trim().optional(),
  email: z.string().email('Email invalide').max(255).optional(),
  language: z.enum(['fr', 'en']).optional(),
  timezone: z.string().max(100).optional(),
})

// ==================== HELPERS ====================

/**
 * Valide les données et retourne une réponse d'erreur si invalide
 *
 * @example
 * ```typescript
 * const validation = await validateRequest(createProjectSchema, await request.json())
 * if (!validation.success) {
 *   return validation.error
 * }
 * const data = validation.data
 * ```
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<
  | { success: true; data: T }
  | { success: false; error: Response }
> {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))

      return {
        success: false,
        error: new Response(
          JSON.stringify({
            error: 'validation_error',
            message: 'Données invalides',
            errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      }
    }

    // Erreur inattendue
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: 'internal_error',
          message: 'Erreur de validation',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    }
  }
}

/**
 * Sanitize user input pour prévenir XSS
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Retirer les balises HTML basiques
    .slice(0, 10000) // Limite de sécurité
}

/**
 * Valide que l'utilisateur est le propriétaire d'une ressource
 */
export function validateOwnership(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId
}
