"use strict";

import {Request, Response} from 'express'
import {IModels, ITeamModel} from '../models'
import * as slug from 'slug'

declare interface RequestWithModels extends Request {
  models: IModels
}

interface ITeamResponse {
  teamid: string;
  name: string;
  members: string[];
}

function slugify(name: string): string {
  return slug(name, { lower: true });
}

function send400(res: Response) {
  res.status(400).contentType('text/plain').send('Bad Request');
}

function send409(res: Response) {
  res.status(409).contentType('text/plain').send('Conflict');
}

function send500(res: Response, err?: Error) {
  console.error('Sending 500 response', err);
  res.status(500).send('Internal Server Error');
}

export var GetAll = function (req: RequestWithModels, res: Response) {
  req.models.Team
    .find({}, 'teamid name members')
    .sort({ teamid: 1 })
    .populate('members', 'userid')
    .exec()
    .then((teams) => {
      let teamsResponse = teams.map((team) => {
        let teamResponse: ITeamResponse = {
          teamid: team.teamid,
          name: team.name,
          members: team.members.map((member) => member.userid)
        };
        return teamResponse;
      });
      res.status(200).send(teamsResponse);
    }, (err) => {
      res.status(500).send('Internal server error');
    });
};

export var GetByTeamId = function (req: RequestWithModels, res: Response) {
  let teamId = req.params.teamId;
  req.models.Team
    .findOne({ teamid: teamId }, 'teamid name members')
    .populate('members', 'userid')
    .exec()
    .then((team) => {
      let teamResponse: ITeamResponse = {
        teamid: team.teamid,
        name: team.name,
        members: team.members.map((member) => member.userid)
      };
      res.status(200).send(teamResponse);
    }, send500.bind(res));
};

export var Create = function (req: RequestWithModels, res: Response) {
  if (req.body.name === undefined || typeof req.body.name !== 'string')
    return send400(res);
    
  if (!Array.isArray(req.body.members))
    return send400(res);
  
  let teamName = req.body.name;
  let members = req.body.members;
  let teamId = slugify(teamName);
  
  let team = new req.models.Team({
    teamid: slugify(teamName),
    name: teamName,
    members: []
  });
  
  if (members === undefined) {
    return team.save((err, result) => {
      if (err) {
        if (err.code === 11000)
          return send409(res);
        return send500(res, err);
      }
      
      let teamResponse: ITeamResponse = {
        teamid: team.teamid,
        name: team.name,
        members: []
      };
      
      res.status(201).send(teamResponse);
    });
  }
  
  let membersQuery = {
    userid: {
      $in: members.map((member) => member.toString())
    }
  };
    
  req.models.User
    .find(membersQuery, '_id')
    .exec()
    .then((users) => {
      
      let team = new req.models.Team({
        teamid: slugify(teamName),
        name: teamName,
        members: users.map((user) => user._id)
      });
      
      team.save((err, result: ITeamModel) => {
        if (err) {
          if (err.code === 11000)
            return send409(res);
          return send500(res, err);
        }
        
        req.models.Team.findById(result._id)
          .populate('members', 'userid')
          .exec()
          .then((team) => {
            let teamResponse: ITeamResponse = {
              teamid: team.teamid,
              name: team.name,
              members: team.members.map((member) => member.userid)
            };
            res.status(201).send(teamResponse);
          }, send500.bind(res));
      });
      
    }, send500.bind(res));
};