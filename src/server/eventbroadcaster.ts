import * as Pusher from 'pusher'
import {Logger} from 'pino'

export class EventBroadcaster {
  private _pusher: Pusher.PusherClient

  constructor(url: string, private log: Logger) {
    if (!url) {
      this.log.warn('Pusher URL is not defined. Suppressing Pusher events.')
      return
    }
    this._pusher = Pusher.forURL(url)
  }

  public trigger(event: string, data: any) {
    if (!this._pusher) {
      return this.log.info(`Suppressing Pusher event "${event}" for channel "api_events"`, data)
    }
    this.log.info(`Sending Pusher event "${event}" to channel "api_events"`)
    this._pusher.trigger('api_events', event, data, null, (err) => {
      if (err) {
        this.log.error(`Unable to send event to pusher: ${err.message}`)
      }
    })
  }
}
