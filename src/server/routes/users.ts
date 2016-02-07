import {Request, Response} from 'express'
import {IUserModel, ITeamModel, IModels} from '../models'
import {Model, Document} from 'mongoose';

declare interface RequestWithModels extends Request {
  models: IModels
}

interface IUserResponse {
  userid: string;
  name: string;
  team?: string;
}

function send500(res: Response, err?: Error) {
  console.error('Sending 500 response', err);
  res.status(500).send('Internal Server Error');
}

export var GetByUserId = function(req: RequestWithModels, res: Response) {
  return req.models.User.findOne({ userid: req.params.userid }, 'userid name' , (err, user) => {
    if (err) return send500(res, err);
    if (!user) return res.status(404).send('User not found');
    
    req.models.Team.findOne({ members: { $in: [user._id] }}, 'name', (err, team) => {
      if (err) return send500(res, err);
      
      let userResponse: IUserResponse = {
        userid: user.userid,
        name: user.name
      };
      if (team) userResponse.team = team.name;
      
      res.status(200).send(userResponse);    
    })
  });
};

export var Create = (req: RequestWithModels, res: Response) => {
  const user = new req.models.User({
    userid: req.body.userid,
    name: req.body.name
  });
  req.models.User.find({ userid: req.body.userid }, (err, users) => {
    if (err) return send500(res, err);
    if (users.length !== 0) return res.status(409).send('User already exists');
    
    user.save((err) => {
      if (err) return send500(res, err);
      
      let userResponse: IUserResponse = {
        userid: user.userid,
        name: user.name
      };
      
      res.status(201).send(userResponse);
    });
  });
};