import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'crypto-intel-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let metaString = '';
          if (Object.keys(meta).length) {
            try {
              metaString = JSON.stringify(meta, null, 2);
            } catch (error) {
              // Handle circular references
              metaString = JSON.stringify(meta, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                  if (value.constructor.name === 'ClientRequest' || 
                      value.constructor.name === 'IncomingMessage') {
                    return '[Circular]';
                  }
                }
                return value;
              }, 2);
            }
          }
          return `${timestamp} [${level}]: ${message} ${metaString}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (isProduction) {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

export default logger; 