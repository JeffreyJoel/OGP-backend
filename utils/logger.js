const fs = require('fs');
const path = require('path');
const util = require('util');
const { createLogger, format, transports, addColors } = require('winston');
const { NODE_ENV } = require('../src/config/config');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine log level based on environment
const level = NODE_ENV === 'production' ? 'info' : 'debug';

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
addColors(colors);

// Define format for logs
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

// Define format for console logs
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

// Create logger instance
const logger = createLogger({
  level,
  levels,
  format: logFormat,
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', format: logFormat }),
    new transports.File({ filename: path.join(logDir, 'combined.log'), format: logFormat }),
  ],
});

// Override console methods in non-production environments
if (NODE_ENV !== 'production') {
  const originalConsole = { ...console };

  console.log = (...args) => {
    const message = util.format(...args);
    logger.info(message);
    originalConsole.log(message);
  };

  console.error = (...args) => {
    const message = util.format(...args);
    logger.error(message);
    originalConsole.error(message);
  };

  console.warn = (...args) => {
    const message = util.format(...args);
    logger.warn(message);
    originalConsole.warn(message);
  };

  console.info = (...args) => {
    const message = util.format(...args);
    logger.info(message);
    originalConsole.info(message);
  };

  if (typeof console.debug === 'function') {
    console.debug = (...args) => {
      const message = util.format(...args);
      logger.debug(message);
      originalConsole.debug(message);
    };
  }
}

module.exports = logger;
