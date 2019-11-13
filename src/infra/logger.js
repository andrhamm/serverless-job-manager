import log4js from 'log4js';

// eslint-disable-next-line no-unused-vars
log4js.addLayout('json', () => ({ _categoryName, ...toLog }) => JSON.stringify(toLog));

log4js.configure({
  appenders: {
    out: { type: 'stdout', layout: { type: 'json' } },
  },
  categories: {
    default: { appenders: ['out'], level: 'debug' },
  },
});

export const makeGetLogger = () => function getLogger() {
  const logger = log4js.getLogger();
  logger.level = 'debug'; // default level is OFF - which means no logs at all.
  return logger;
};
