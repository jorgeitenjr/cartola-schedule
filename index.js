const schedule = require('node-schedule');
const {runAt} = require('./runAt');
const winston = require('winston');
require('winston-daily-rotate-file');
const {getNextRunningDate, startSchedule} = require('./cartola');

const transport = new winston.transports.DailyRotateFile({
  filename: 'cartola-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {service: 'cartola-schedule'},
  transports: [transport, new winston.transports.File({filename: 'error.log', level: 'error'})],
});
/**
 * Run every day to check the next market close.
 * */
let lastTimeout;
schedule.scheduleJob('0 0 8 * * *', async () => {
  logger.info(`Starting daily routine at: ${new Date()}`);
  const dateToRun = await getNextRunningDate(logger);
  if (lastTimeout) {
    logger.debug(`Last timeout cleared: ${lastTimeout}`);
    clearTimeout(lastTimeout);
  }
  const timeout = runAt(dateToRun.format('DD/MM/YYYY HH:mm'), () => startSchedule(logger));
  lastTimeout = timeout;
  logger.info(`Finishing daily routine at: ${new Date()}`);
});
