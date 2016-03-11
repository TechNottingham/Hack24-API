"use strict";

import * as express from 'express';
import {Server as HttpServer} from 'http';
import * as mongoose from 'mongoose';
import * as UsersRoute from './routes/users';
import * as TeamsRoute from './routes/teams';
import * as AttendeesRoute from './routes/attendees';
import * as TeamMembersRoute from './routes/team.members';
import * as Root from './routes/root';
import {UserModel, TeamModel, AttendeeModel} from './models';
import {json as jsonParser} from 'body-parser';
import {Request, Response} from 'express';
import * as respond from './routes/respond'
import {logger} from './expresslogger'

const AuthorisedUsers = {
  Hackbot: {
    Password: process.env.HACKBOT_PASSWORD || 'h4c6b07'
  },
  Admin: {
    Username: process.env.ADMIN_USERNAME || 'admin',
    Password: process.env.ADMIN_PASSWORD || '4d3in'
  }
};

declare interface IUnauthorisedRequest extends Request {
  AuthParts: {
    Username: string;
    Password: string;
  }
}

function createModels(req, res, next) {
  req.models = {
    User: UserModel,
    Team: TeamModel,
    Attendee: AttendeeModel
  };
  return next();
}

function requiresUser(req: IUnauthorisedRequest, res: Response, next: Function) {
  if (req.headers['authorization'] === undefined)
    return respond.Send401(res);
    
  const authParts = req.headers['authorization'].split(' ');
  if (authParts.length < 2 || authParts[0] !== 'Basic')
    return respond.Send403(res);
    
  const decoded = new Buffer(authParts[1], 'base64').toString("ascii");
  const decodedParts = decoded.split(':');
  if (decodedParts.length < 2)
    return respond.Send403(res);
  
  req.AuthParts = {
    Username: decodedParts[0],
    Password: decodedParts[1]
  };
  
  next();
}

function requiresAdminUser(req: IUnauthorisedRequest, res: Response, next: Function) {
  if (req.AuthParts.Username !== AuthorisedUsers.Admin.Username || req.AuthParts.Password !== AuthorisedUsers.Admin.Password)
    return respond.Send403(res);
  
  next();
}

function requiresAttendeeUser(req: IUnauthorisedRequest, res: Response, next: Function) {
  if (req.AuthParts.Password !== AuthorisedUsers.Hackbot.Password)
    return respond.Send403(res);
    
  AttendeeModel
    .find({ attendeeid: req.AuthParts.Username }, '_id')
    .limit(1)
    .exec()
    .then((attendees) => {
      if (attendees.length === 0)
        return respond.Send403(res);
        
      next();
    }, respond.Send500.bind(null, res))
}

export interface ServerInfo {
  IP: string
  Port: number
}

export class Server {
  private _app: express.Application;
  private _server: HttpServer;

  constructor() {
    const apiJsonParser = jsonParser({ type: 'application/vnd.api+json'});

    this._app = express();
    
    this._app.use(logger());

    this._app.get('/users', createModels, UsersRoute.GetAll);
    this._app.post('/users', requiresUser, requiresAttendeeUser, apiJsonParser, createModels, UsersRoute.Create);
    
    this._app.get('/users/:userid', createModels, UsersRoute.Get);
    
    
    this._app.post('/teams/:teamId/members', requiresUser, requiresAttendeeUser, apiJsonParser, createModels, TeamMembersRoute.Add);
    this._app.delete('/teams/:teamId/members', requiresUser, requiresAttendeeUser, apiJsonParser, createModels, TeamMembersRoute.Delete);
    this._app.get('/teams/:teamId/members', createModels, TeamMembersRoute.Get);

    
    this._app.patch('/teams/:teamId', requiresUser, requiresAttendeeUser, apiJsonParser, createModels, TeamsRoute.Update);
    this._app.get('/teams/:teamId', createModels, TeamsRoute.Get);
    
    
    this._app.get('/teams', createModels, TeamsRoute.GetAll);
    this._app.post('/teams', requiresUser, requiresAttendeeUser, apiJsonParser, createModels, TeamsRoute.Create);
    
    
    this._app.get('/attendees/:attendeeid', requiresUser, requiresAdminUser, createModels, AttendeesRoute.Get);
    this._app.delete('/attendees/:attendeeid', requiresUser, requiresAdminUser, createModels, AttendeesRoute.Delete);
    this._app.get('/attendees', requiresUser, requiresAdminUser, createModels, AttendeesRoute.GetAll);
    this._app.post('/attendees', requiresUser, requiresAdminUser, apiJsonParser, createModels, AttendeesRoute.Create);

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

