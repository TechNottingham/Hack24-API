import * as Pusher from 'pusher'
import { Logger } from 'pino'

export default class EventBroadcaster {
  private _pusher: Pusher.PusherClient

  constructor(url: string, private log: Logger) {
    if (!url) {
      this.log.warn('Pusher URL is not defined. Suppressing Pusher events.')
      return
    }
    this._pusher = Pusher.forURL(url)
  }

  public trigger(event: string, data: any, log?: Logger) {
    const logger = log ? log : this.log
    if (!this._pusher) {
      return logger.info(`Suppressing Pusher event "${event}" for channel "api_events"`, data)
    }
    logger.info(`Sending Pusher event "${event}" to channel "api_events"`)
    this._pusher.trigger('api_events', event, data, null, (err) => {
      if (err) {
        logger.error(`Unable to send event to pusher: ${err.message}`)
      }
    })
  }
}
