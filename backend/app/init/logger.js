// app/init/logger.js
const dotenv = require('dotenv');
dotenv.config();
const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const { getAdminSetting } = require('./redisUtils');

async function createLogger() {
  const logLevel = await getAdminSetting("LOG_LEVEL");
  return winston.createLogger({
    level: logLevel,
    format: combine(timestamp(), json()),
    transports: [
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH,
      }),
    ],
  });
}

module.exports = { createLogger };
