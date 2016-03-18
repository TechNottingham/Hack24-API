"use strict";

import * as express from 'express'
import {json as jsonBodyParser} from 'body-parser'
import {Server} from 'http'
import {EventEmitter} from 'events'

const bodyParser = jsonBodyParser();

interface IPusherEventPayload {
  name: string;
  data: any;
  channels: string[];
}

export interface IPusherEvent {
  appId: string;
  contentType: string;
  payload: IPusherEventPayload;
}

export class PusherListener {
  private _server: Server;
  private _events: IPusherEvent[];
  private _monitor: EventEmitter;
  
  public get events(): IPusherEvent[] {
    return this._events;
  }
  
  static Create(port: number) {
    return new PusherListener().listen(port);
  }
  
  constructor() {
    this._events = [];
    this._monitor = new EventEmitter();
  }
  
  async listen(port: number) {
    return new Promise<PusherListener>((resolve, reject) => {
      this._server = express()
        .use(bodyParser)
        .post('/apps/:appId/events', (req, res) => {
          this._events.push({
            appId: req.params.appId,
            contentType: req.header('content-type'),
            payload: req.body
          });
          res.status(200).send({});
          this._monitor.emit('event');
        })
        .listen(port, () => {
          resolve(this);
        });
    });
  }
  
  async waitForEvent() {
    return this.waitForEvents(1);
  }
  
  async waitForEvents(count: number) {
    return new Promise<void>((resolve) => {
      let resolved = false;
      
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        resolve();
      }, 500);
      
      const tryResolve = () => {
        if (resolved) return;
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
  
  async close() {
    return new Promise((resolve) => {
      this._server.close(resolve);
    });
  }
}