"use strict";

import * as express from 'express';
import {Server as HttpServer} from 'http';
import * as mongoose from 'mongoose';
import * as UsersRoute from './routes/users';
import * as TeamsRoute from './routes/teams';
import * as Root from './routes/root';
import {UserModel, TeamModel} from './models';
import {json as jsonParser} from 'body-parser';
import {Request, Response} from 'express';
import * as respond from './routes/respond'

function createModels(req, res, next) {
  req.models = {
    User: UserModel,
    Team: TeamModel
  };
  return next();
}

function requiresHackbotUser(req: Request, res: Response, next: Function) {
  if (req.headers['authorization'] === undefined)
    return respond.Send401(res);
    
  const authParts = req.headers['authorization'].split(' ');
  if (authParts.length < 2 || authParts[0] !== 'Basic')
    return respond.Send403(res);
    
  const decoded = new Buffer(authParts[1], 'base64').toString("ascii");
  const decodedParts = decoded.split(':');
  if (decodedParts.length < 2)
    return respond.Send403(res);
  
  if (decodedParts[0] !== process.env.HACKBOT_USERNAME || decodedParts[1] !== process.env.HACKBOT_PASSWORD)
    return respond.Send403(res);
  
  next();
}

export interface ServerInfo {
  IP: string
  Port: number
}

export class Server {
  private _app: express.Application;
  private _server: HttpServer;

  constructor() {
    const bodyParser = jsonParser();

    this._app = express();

    this._app.get('/users/', createModels, UsersRoute.GetAll);
    this._app.get('/users/:userid', bodyParser, createModels, UsersRoute.GetByUserId);
    this._app.post('/users/', requiresHackbotUser, bodyParser, createModels, UsersRoute.Create);

    this._app.get('/teams/', createModels, TeamsRoute.GetAll);
    this._app.get('/teams/:teamId/members', createModels, TeamsRoute.GetTeamMembers);
    this._app.get('/teams/:teamId', createModels, TeamsRoute.GetByTeamId);
    this._app.post('/teams/', bodyParser, createModels, TeamsRoute.Create);

    this._app.get('/api', (req, res) => {
      res.send('Hack24 API is running');
    });
    
    this._app.get('/', Root.Get);
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

