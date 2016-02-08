import * as express from 'express';
import {Server as HttpServer} from 'http';
import * as mongoose from 'mongoose';
import * as UsersRoute from './routes/users';
import * as TeamsRoute from './routes/teams';
import {UserModel, TeamModel} from './models';
import {json as jsonParser} from 'body-parser';
import {Request, Response} from 'express';

function createModels(req, res, next) {
  req.models = {
    User: UserModel,
    Team: TeamModel
  };
  return next();
}

function send401(res) {
  res.status(401)
     .header('WWW-Authenticate', 'Basic realm="api.hack24.co.uk"')
     .type('text/plain')
     .send('Unauthorized');
}

function send403(res) {
  res.status(403)
     .type('text/plain')
     .send('Forbidden');
}

function requiresBasicAuth(req: Request, res: Response, next: Function) {
  if (req.headers['authorization'] === undefined)
    return send401(res);

  next();
}

function requiresHackbotUser(req: Request, res: Response, next: Function) {
  const authParts = req.headers['authorization'].split(' ');
  if (authParts.length < 2 || authParts[0] !== 'Basic')
    return send403(res);
    
  const decoded = new Buffer(authParts[1], 'base64').toString("ascii");
  const decodedParts = decoded.split(':');
  if (decodedParts.length < 2)
    return send403(res);
  
  console.log(decodedParts);
  
  if (decodedParts[0] !== 'hackbot' || decodedParts[1] !== process.env.HACKBOT_PASSWORD)
    return send403(res);
  
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
    mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
    
    const bodyParser = jsonParser();

    this._app = express();

    this._app.get('/users/:userid', bodyParser, createModels, UsersRoute.GetByUserId);
    this._app.post('/users/', requiresBasicAuth, requiresHackbotUser, bodyParser, createModels, UsersRoute.Create);

    this._app.post('/teams/', bodyParser, createModels, TeamsRoute.Create);

    this._app.get('/api', (req, res) => {
      res.send('Hack24 API is running');
    });
  }

  listen(): Promise<ServerInfo> {
    const port = process.env.PORT || 5000;

    return new Promise<ServerInfo>((resolve, reject) => {
      this._server = this._app.listen(port, function(err) {
        if (err) return reject(err);
        resolve({ IP: '0.0.0.0', Port: port });
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

