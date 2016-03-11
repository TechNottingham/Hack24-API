import * as morgan from 'morgan'
import {transports, Logger} from 'winston'

const consoleLogger = new transports.Console({
  level: 'debug',
  timestamp: true,
  handleExceptions: false,
  colorize: true
});

export function logger() {
  
  const logger = new Logger({
    transports: [consoleLogger],
    exitOnError: true
  });
  
  const stream: morgan.StreamOptions = {
    write: function (message) {
      logger.info(message);
    }
  };
  
  const options = <morgan.Options> {
    stream: stream
  }
  
  return morgan("dev", options);
};