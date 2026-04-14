const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.simple(),
        ),
  ),
  transports: [
    new winston.transports.Console(),
    ...(process.env.LOG_FILE
      ? [new winston.transports.File({ filename: process.env.LOG_FILE })]
      : []),
  ],
});

module.exports = logger;
