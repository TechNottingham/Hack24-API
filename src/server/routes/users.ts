"use strict";

import {Request, Response} from 'express'
import {IUserModel, ITeamModel, IModels} from '../models'
import {Model, Document} from 'mongoose';
import * as respond from './respond';

declare interface RequestWithModels extends Request {
  models: IModels
}

interface IUserResponse {
  userid: string;
  name: string;
  team?: string;
}

export var GetByUserId = function(req: RequestWithModels, res: Response) {
  if (req.params.userid === undefined || typeof req.params.userid !== 'string')
    return respond.Send400(res);
    
  req.models.User
    .findOne({ userid: req.params.userid }, 'userid name')
    .exec()
    .then((user) => {
      if (!user)
        return respond.Send404(res);
      
      req.models.Team
        .findOne({ members: { $in: [user._id] }}, 'name')
        .exec()
        .then((team) => {
          let userResponse: IUserResponse = {
            userid: user.userid,
            name: user.name
          };
          
          if (team)
            userResponse.team = team.name;
          
          res.status(200).send(userResponse);    
        }, respond.Send500.bind(res))
    }, respond.Send500.bind(res));
};

export var Create = (req: RequestWithModels, res: Response) => {
  if (req.body.userid === undefined || typeof req.body.userid !== 'string')
    return respond.Send400(res);
    
  if (req.body.name === undefined || typeof req.body.name !== 'string')
    return respond.Send400(res);
    
  const user = new req.models.User({
    userid: req.body.userid,
    name: req.body.name
  });
  
  user.save((err) => {
    if (err) {
      if (err.code === 11000)
        return respond.Send409(res);
      return respond.Send500(res, err);
    }
    
    let userResponse: IUserResponse = {
      userid: user.userid,
      name: user.name
    };
    
    res.status(201).send(userResponse);
  });
};