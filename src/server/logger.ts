import * as morgan from 'morgan';
import {transports, Logger} from 'winston';

const consoleLogger = new transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : process.env.LOG_LEVEL || 'debug',
  timestamp: true,
  handleExceptions: false,
  colorize: process.env.NODE_ENV !== 'production',
});

const logger = new Logger({
  transports: [consoleLogger],
  exitOnError: true,
});

const lineBreakRegex = /^\s+|\s+$/g;

const stream: morgan.StreamOptions = {
  write: (message) => {
    logger.debug(message.replace(lineBreakRegex, ''));
  },
};

const options = <morgan.Options> {
  stream: stream,
};

export const ExpressLogger = morgan('dev', options);
export const Log = logger;
