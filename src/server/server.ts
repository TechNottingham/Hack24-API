"use strict";

import * as respond from './routes/respond';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as Root from './routes/root';
import * as middleware from './middleware';

import {Server as HttpServer} from 'http';
import {UsersRoute} from './routes/users';
import {TeamsRoute} from './routes/teams';
import {AttendeesRoute} from './routes/attendees';
import {TeamMembersRoute} from './routes/team.members';
import {ExpressLogger} from './logger'
import {EventBroadcaster} from './eventbroadcaster'

export interface ServerInfo {
  IP: string
  Port: number
}

export class Server {
  private _app: express.Application;
  private _server: HttpServer;

  constructor() {
    const eventBroadcaster = new EventBroadcaster();
    
    const usersRouter = new UsersRoute(eventBroadcaster).createRouter();
    const teamsRouter = new TeamsRoute(eventBroadcaster).createRouter();
    const teamMembersRouter = new TeamMembersRoute(eventBroadcaster).createRouter();
    const attendeesRouter = new AttendeesRoute(eventBroadcaster).createRouter();

    this._app = express();
    
    if (process.env.NODE_ENV !== 'production')
      this._app.use(ExpressLogger);

    this._app.use('/attendees', attendeesRouter);
    this._app.use('/users', usersRouter);
    this._app.use('/teams', teamMembersRouter);
    this._app.use('/teams', teamsRouter);

    this._app.get('/api', middleware.allowAllOriginsWithGetAndHeaders, (req, res) => {
      res.send('Hack24 API is running');
    });
    this._app.options('/api', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    
    this._app.get('/', Root.Get);
    this._app.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
  }

  listen(): Promise<ServerInfo> {
    return new Promise<ServerInfo>((resolve, reject) => {
      mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
      
      var db = mongoose.connection;
      db.on('error', (err) => {
        db.removeAllListeners('open');
        err.message = `Unable to connect to MongoDB - ${err.message}`;
        reject(err);
      });
      
      db.once('open', () => {
        const port = process.env.PORT || 5000;

        this._server = this._app.listen(port, function(err) {
          if (err) return reject(err);
          resolve({ IP: '0.0.0.0', Port: port });
        });
      });
      
    });
  }
  
  close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._server.close(() => {
        resolve();
      });
    });
  }
}
