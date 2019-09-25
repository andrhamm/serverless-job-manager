import log4js from 'log4js';

log4js.addLayout('json', _config =>
  // TODO: format to be consistent with ELK logging
  ({ _categoryName, ...toLog }) => JSON.stringify(toLog),
);

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
