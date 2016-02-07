import {Request, Response} from 'express'
import {IModels, ITeamModel} from '../models'

declare interface RequestWithModels extends Request {
  models: IModels
}

interface ITeamResponse { 
  name: string;
  members: string[];
}

export var Get = function(req, res) {
  return req.models.Team.find(function(err, teams) {
    if (err) return console.log(err);
    return res.send(teams);
  });
};

export var GetById = function(req, res) {
  return req.models.Team.findById(req.params.id)
    .populate('members')
    .exec(function(err, team) {
      if (!err) {
        return res.send(team);
      } else {
        return console.log(err);
      }
    });
};

export var GetByName = function(req, res) {
  return req.models.Team.findOne({ 'name': req.params.name })
    .populate('members')
    .exec(function(err, team) {
      if (!err) {
        return res.send(team);
      } else {
        return console.log(err);
      }
    });
};


export var Create = function(req: RequestWithModels, res: Response) {
  let team = new req.models.Team({
    name: req.body.name
  });
  console.log(req.body);
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
          console.log(teamResponse);
          
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


export var Update = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    team.name = req.body.name;
    team.motto = req.body.motto;
    team.modified = Date.now;
    return team.save(function(err) {
      if (!err) {
        console.log("updated");
      } else {
        console.log(err);
      }
      return res.send(team);
    });


  });
};

export var Delete = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    return team.remove(function(err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
      }
    });
  });
};


export var AddMember = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    team.modified = Date.now;
    return req.models.findById(req.params.id, function(err, user, team) {
      if (!err) {
        team.members.push(user);
        return team.save(function(err) {
          if (!err) {
            console.log("updated");
          } else {
            console.log(err);
          }
          return res.send(team);
        });
      } else {
        console.log(err);
        return res.status(404).send('User not found');
      }
    });


  });
};
