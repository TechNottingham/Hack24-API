import {Request, Response} from 'express'
import {IModels, ITeamModel} from '../models'

declare interface RequestWithModels extends Request {
  models: IModels
}

interface ITeamResponse { 
  name: string;
  members: string[];
}

export var Create = function(req: RequestWithModels, res: Response) {
  let team = new req.models.Team({
    name: req.body.name
  });
  req.models.Team.find({ name: req.body.name }, (err, teams) => {
    if (err) return res.status(500).send('Internal server error');
    if (teams.length !== 0) return res.status(409).send('Team already exists');
    
    function saveTeam(team: ITeamModel, res: Response) {
      team.save((err, result) => {
        if (err) return res.status(500).send('Internal server error');
        
        let teamResponse: ITeamResponse = {
          name: team.name,
          members: []
        };
        
        req.models.User.find({ _id: { $in: team.members }}, 'userid', (err, users) => {
          teamResponse.members = users.map((user) => user.userid);
          res.status(201).send(teamResponse);
        });
      });
    }
    
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