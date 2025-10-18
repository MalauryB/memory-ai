import pino from 'pino'

// Configuration du logger selon l'environnement
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // En développement : format lisible avec pino-pretty
  // En production : format JSON pour parsing
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Contexte de base ajouté à tous les logs
  base: {
    env: process.env.NODE_ENV,
  },

  // Timestamp automatique
  timestamp: pino.stdTimeFunctions.isoTime,
})

/**
 * Logger pour les routes API avec contexte enrichi
 */
export function createAPILogger(route: string, method: string) {
  return logger.child({
    context: 'API',
    route,
    method,
  })
}

/**
 * Logger pour les opérations Supabase
 */
export function createDBLogger(table: string, operation: string) {
  return logger.child({
    context: 'Database',
    table,
    operation,
  })
}

/**
 * Logger pour les opérations AI
 */
export function createAILogger(operation: string) {
  return logger.child({
    context: 'AI',
    operation,
  })
}

/**
 * Helper pour logger les erreurs avec stack trace
 */
export function logError(error: unknown, context?: string) {
  const errorLogger = context ? logger.child({ context }) : logger

  if (error instanceof Error) {
    errorLogger.error({
      err: error,
      message: error.message,
      stack: error.stack,
    }, 'Error occurred')
  } else {
    errorLogger.error({ error }, 'Unknown error occurred')
  }
}

/**
 * Helper pour logger les requêtes avec durée
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number
) {
  logger.info({
    method,
    path,
    userId,
    duration: duration ? `${duration}ms` : undefined,
  }, 'API Request')
}
