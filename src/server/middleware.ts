import * as respond from './routes/respond';
import {Request, Response} from 'express';
import {AttendeeModel} from './models';
import {Log} from './logger';

const AuthorisedUsers = {
  Hackbot: {
    Password: process.env.HACKBOT_PASSWORD
  },
  Admin: {
    Username: process.env.ADMIN_USERNAME,
    Password: process.env.ADMIN_PASSWORD
  }
};

declare interface IUnauthorisedRequest extends Request {
  AuthParts: {
    Username: string;
    Password: string;
  }
}

export function requiresUser(req: IUnauthorisedRequest, res: Response, next: Function) {
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

export function requiresAdminUser(req: IUnauthorisedRequest, res: Response, next: Function) {
  if (req.AuthParts.Username !== AuthorisedUsers.Admin.Username || req.AuthParts.Password !== AuthorisedUsers.Admin.Password)
    return respond.Send403(res);
  
  next();
}

export function requiresAttendeeUser(req: IUnauthorisedRequest, res: Response, next: Function) {
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

export function allowAllOriginsWithGetAndHeaders(req: IUnauthorisedRequest, res: Response, next: Function) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Request-Method', 'GET');
  res.header('Access-Control-Request-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}

export function AsyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
      fn.call(this, req, res).catch((err) => {
        Log.error('AsyncHandler caught an unhandled error -', err);
        respond.Send500(res);
      })
  };
}