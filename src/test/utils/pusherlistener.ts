"use strict";

import * as express from 'express'
import {json as jsonBodyParser} from 'body-parser'
import {Server} from 'http'

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
  
  public get events(): IPusherEvent[] {
    return this._events;
  }
  
  static Create(port: number) {
    return new PusherListener().listen(port);
  }
  
  constructor() {
    this._events = [];
  }
  
  listen(port: number): Promise<PusherListener> {
    return new Promise((resolve, reject) => {
      this._server = express()
        .use(bodyParser)
        .post('/apps/:appId/events', (req, res) => {
          this._events.push({
            appId: req.params.appId,
            contentType: req.header('content-type'),
            payload: req.body
          });
          res.status(200).send({});
        })
        .listen(port, () => {
          resolve(this);
        });
    });
  }
  
  close() {
    return new Promise((resolve) => {
      this._server.close(resolve);
    });
  }
}