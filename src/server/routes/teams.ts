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

function send409(res: Response) {
  res.status(409).contentType('text/plain').send('Conflict');
}

export var GetAll = function(req: RequestWithModels, res: Response) {
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

export var Create = function(req: RequestWithModels, res: Response) {
  let teamName = req.body.name;
  let teamId = slugify(teamName);
  
  req.models.Team.find({ teamid: teamId }, (err, teams) => {
    if (err) return res.status(500).send('Internal server error');
    if (teams.length !== 0) return send409(res);
    
    function saveTeam(team: ITeamModel, res: Response) {
      team.save((err, result) => {
        if (err) return res.status(500).send('Internal server error');
        
        let teamResponse: ITeamResponse = {
          teamid: team.teamid,
          name: team.name,
          members: []
        };
        
        req.models.User.find({ _id: { $in: team.members }}, 'userid', (err, users) => {
          teamResponse.members = users.map((user) => user.userid);
          res.status(201).send(teamResponse);
        });
      });
    }
    
    let team = new req.models.Team({
      teamid: slugify(teamName),
      name: teamName
    });
    
    if (req.body.members && req.body.members.length > 0) {
      return req.models.User.find({ userid: { $in: req.body.members }}, '_id', (err, users) => {
        
        team.members = users.map((user) => {
          return user._id;
        });
        saveTeam(team, res);
      });
    }
    
    saveTeam(team, res);
  });
};