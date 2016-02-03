import * as express from 'express';
import {Server as HttpServer} from 'http';
import * as mongoose from 'mongoose';
import * as UsersRoute from './routes/users';
import * as TeamsRoute from './routes/teams';
import {UserModel} from './models'
import {TeamModel} from './models'
import {json as jsonParser} from 'body-parser'

function createModels(req, res, next) {
  req.models = {
    User: mongoose.model('User', UserModel),
    Team: mongoose.model('Team', TeamModel)
  };
  return next();
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

    this._app = express();

    this._app.use(jsonParser());

    this._app.get('/users', createModels, UsersRoute.Get);
    this._app.get('/users/:id', createModels, UsersRoute.GetById);
    this._app.get('/users/:id', createModels, UsersRoute.GetByName);
    this._app.delete('/users/:id', createModels, UsersRoute.Delete);
    this._app.post('/users/', createModels, UsersRoute.Create);
    this._app.put('/users/:id,createModels', UsersRoute.Update);

    this._app.get('/teams', createModels, TeamsRoute.Get);
    this._app.get('/teams/:id', createModels, TeamsRoute.GetById);
    this._app.delete('/teams/:id', createModels, TeamsRoute.Delete);
    this._app.post('/teams/', createModels, TeamsRoute.Create);
    this._app.put('/teams/:id', createModels, TeamsRoute.Update);

    this._app.get('/api', function(req, res) {
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
}

