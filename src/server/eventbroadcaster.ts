import * as Pusher from 'pusher'
import {Log} from './logger'

export class EventBroadcaster {
  private _pusher: Pusher.Pusher;
  
  constructor() {
    this._pusher = Pusher.forURL(process.env.PUSHER_URL);
  }
  
  trigger(event: string, data: any) {
    Log.info(`Sending Pusher event "${event}" to channel "api_events"`);
    this._pusher.trigger('api_events', event, data, null, (err: Error) => {
      if (err) Log.error(`Unable to send event to pusher: ${err.message}`);
    });  
  }
}
