"use strict";

import {Request, Response} from 'express';
import {IModels, ITeamModel, MongoDBErrors} from '../models';
import * as slug from 'slug';
import * as respond from './respond';

declare interface RequestWithModels extends Request {
  models: IModels
}

interface ITeamResponse {
  teamid: string;
  name: string;
  members: string[];
}

interface ITeamsResponse {
  count: number;
  startindex: number;
  totalcount: number;
  teams: ITeamResponse[];
}

function slugify(name: string): string {
  return slug(name, { lower: true });
}

export function GetAll(req: RequestWithModels, res: Response) {
  let startindex = req.query.startindex !== undefined ? parseInt(req.query.startindex, 10) : 0;
  let count = req.query.count !== undefined ? parseInt(req.query.count, 10) : 15;
  
  req.models.Team
    .find({}, 'teamid name members')
    .sort({ teamid: 1 })
    .skip(startindex)
    .limit(count)
    .populate('members', 'userid')
    .exec()
    .then((teams) => {
      
      let teamResponses: ITeamResponse[] = teams.map((team) => {
        let teamResponse: ITeamResponse = {
          teamid: team.teamid,
          name: team.name,
          members: team.members.map((member) => member.userid)
        };
        return teamResponse;
      });
      
      req.models.Team
        .count({})
        .exec()
        .then((totalCount) => {
          
          let teamsResponse: ITeamsResponse = {
            count: teams.length,
            startindex: startindex,
            totalcount: totalCount,
            teams: teamResponses
          };
          res.status(200).send(teamsResponse);
          
        }, respond.Send500.bind(res));
    }, respond.Send500.bind(res));
};

export function GetByTeamId(req: RequestWithModels, res: Response) {
  let teamId = req.params.teamId;
  req.models.Team
    .findOne({ teamid: teamId }, 'teamid name members')
    .populate('members', 'userid')
    .exec()
    .then((team) => {
      if (team === null) return respond.Send404(res);
      let teamResponse: ITeamResponse = {
        teamid: team.teamid,
        name: team.name,
        members: team.members.map((member) => member.userid)
      };
      res.status(200).send(teamResponse);
    }, respond.Send500.bind(res));
};

export function Create(req: RequestWithModels, res: Response) {
  if (req.body.name === undefined || typeof req.body.name !== 'string')
    return respond.Send400(res);
    
  if (!Array.isArray(req.body.members))
    return respond.Send400(res);
  
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
        if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
          return respond.Send409(res);
        return respond.Send500(res, err);
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
          if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
            return respond.Send409(res);
          return respond.Send500(res, err);
        }
        
        req.models.Team
          .findById(result._id)
          .populate('members', 'userid')
          .exec()
          .then((team) => {
            let teamResponse: ITeamResponse = {
              teamid: team.teamid,
              name: team.name,
              members: team.members.map((member) => member.userid)
            };
            res.status(201).send(teamResponse);
          }, respond.Send500.bind(res));
      });
      
    }, respond.Send500.bind(res));
};