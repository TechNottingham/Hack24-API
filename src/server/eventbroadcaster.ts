import * as Pusher from 'pusher'
import {Log} from './logger'

export class EventBroadcaster {
  private _pusher: Pusher.PusherClient

  constructor(url: string) {
    if (!url) {
      Log.warn('Pusher URL is not defined. Suppressing Pusher events.')
      return
    }
    this._pusher = Pusher.forURL(url)
  }

  public trigger(event: string, data: any) {
    if (!this._pusher) {
      return Log.info(`Suppressing Pusher event "${event}" for channel "api_events"`, data)
    }
    Log.info(`Sending Pusher event "${event}" to channel "api_events"`)
    this._pusher.trigger('api_events', event, data, null, (err) => {
      if (err) {
        Log.error(`Unable to send event to pusher: ${err.message}`)
      }
    })
  }
}
