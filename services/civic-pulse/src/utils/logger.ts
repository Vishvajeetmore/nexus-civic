import winston, { type Logger } from 'winston';

/**
 * Create a per-service Winston logger.
 * Usage: const logger = createLogger('civic-pulse')
 */
export function createLogger(serviceName: string): Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaSuffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${serviceName}] ${level}: ${String(message)}${metaSuffix}`;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.File({ filename: 'errors.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ];

  if (!isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), baseFormat),
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: baseFormat,
    transports,
  });
}

export const logger = createLogger('civic-pulse');
