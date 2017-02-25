import * as express from 'express';
import {json as jsonBodyParser} from 'body-parser';
import {Server} from 'http';
import {EventEmitter} from 'events';

const bodyParser = jsonBodyParser();

interface PusherEventPayload {
  name: string;
  data: any;
  channels: string[];
}

export interface PusherEvent {
  appId: string;
  contentType: string;
  payload: PusherEventPayload;
  data: any;
}

export class PusherListener {

  public static Create(port: number) {
    return new PusherListener().listen(port);
  }

  private _server: Server;
  private _events: PusherEvent[];
  private _monitor: EventEmitter;

  public get events(): PusherEvent[] {
    return this._events;
  }

  constructor() {
    this._events = [];
    this._monitor = new EventEmitter();
  }

  public getEvent(filterFn: (event: PusherEvent) => boolean): PusherEvent {
    for (let ev of this._events) {
      if (filterFn(ev)) {
        return ev;
      }
    }
    return null;
  }

  public async listen(port: number) {
    return new Promise<PusherListener>((resolve) => {
      this._server = express()
        .use(bodyParser)
        .post('/apps/:appId/events', (req, res) => {
          const data = JSON.parse(req.body.data);
          this._events.push({
            appId: req.params.appId,
            contentType: req.header('content-type'),
            payload: req.body,
            data,
          });
          res.status(200).send({});
          this._monitor.emit('event');
        })
        .listen(port, () => {
          resolve(this);
        });
    });
  }

  public async waitForEvent() {
    return this.waitForEvents(1);
  }

  public async waitForEvents(count: number, timeout: number = 500) {
    return new Promise<void>((resolve) => {
      let resolved = false;

      setTimeout(() => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve();
      }, timeout);

      const tryResolve = () => {
        if (resolved) {
          return;
        }
        if (this._events.length >= count) {
          resolved = true;
          resolve();
          return;
        }
        this._monitor.once('event', tryResolve);
      };

      tryResolve();
    });
  }

  public async close() {
    return new Promise((resolve) => {
      this._server.close(resolve);
    });
  }
}
