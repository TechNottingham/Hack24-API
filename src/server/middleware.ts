import { WebClient } from '@slack/client';
import * as respond from './routes/respond';
import { Request, Response, NextFunction } from 'express';
import { AttendeeModel } from './models';
import { Log } from './logger';

const AuthorisedUsers = {
  Hackbot: {
    Password: process.env.HACKBOT_PASSWORD,
  },
  Admin: {
    Username: process.env.ADMIN_USERNAME,
    Password: process.env.ADMIN_PASSWORD,
  },
};

interface UnauthorisedRequest {
  AuthParts: {
    Username: string;
    Password: string;
  };
}

const slack = new WebClient(process.env.SLACK_API_TOKEN, {
  slackAPIUrl: process.env.SLACK_API_URL,
});

export function requiresUser(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  if (req.headers['authorization'] === undefined) {
    return respond.Send401(res);
  }

  const authParts = req.headers['authorization'].split(' ');
  if (authParts.length < 2 || authParts[0] !== 'Basic') {
    return respond.Send403(res);
  }

  const decoded = new Buffer(authParts[1], 'base64').toString("ascii");
  const decodedParts = decoded.split(':');
  if (decodedParts.length < 2) {
    return respond.Send403(res);
  }

  req.AuthParts = {
    Username: decodedParts[0],
    Password: decodedParts[1],
  };

  next();
}

export function requiresAdminUser(req: Request & UnauthorisedRequest, res: Response, next: Function) {
  if (req.AuthParts.Username !== AuthorisedUsers.Admin.Username || req.AuthParts.Password !== AuthorisedUsers.Admin.Password) {
    return respond.Send403(res);
  }

  next();
}

export function requiresAttendeeUser(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  return AsyncHandler(requiresAttendeeUserAsync)(req, res, next);
}

async function requiresAttendeeUserAsync(req: Request & UnauthorisedRequest, res: Response, next: NextFunction) {
  if (req.AuthParts.Password !== AuthorisedUsers.Hackbot.Password) {
    return respond.Send403(res);
  }

  if (req.AuthParts.Username.indexOf('@') > -1) {
    const attendees = await AttendeeModel
      .find({ attendeeid: req.AuthParts.Username }, '_id')
      .limit(1)
      .exec();

    if (attendees.length === 0) {
      return respond.Send403(res);
    }

    return next();
  }

  const attendees = await AttendeeModel
    .find({ slackid: req.AuthParts.Username }, '_id')
    .limit(1)
    .exec();

  if (attendees.length !== 0) {
    return next();
  }

  const response = await slack.users.info(req.AuthParts.Username);

  if (!response.ok) {
    return respond.Send403(res);
  }

  const updateResponse = await AttendeeModel
    .findOneAndUpdate({ attendeeid: response.user.profile.email }, { slackid: response.user.id }, '_id')
    .exec();

  if (updateResponse === null) {
    return respond.Send403(res);
  }

  next();
}

export function allowAllOriginsWithGetAndHeaders(_: Request & UnauthorisedRequest, res: Response, next: Function) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Request-Method', 'GET');
  res.header('Access-Control-Request-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}

export function AsyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn.call(this, req, res, next).catch((err) => {
      Log.error('AsyncHandler caught an unhandled error -', err);
      respond.Send500(res);
    });
  };
}
