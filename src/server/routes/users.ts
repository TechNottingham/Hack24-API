"use strict";

import {Request, Response} from 'express'
import {IUserModel, ITeamModel, IModels, MongoDBErrors} from '../models'
import * as respond from './respond';
import {UserResponse, UsersResponse, TeamResponse} from '../responses'

declare interface RequestWithModels extends Request {
  models: IModels
}

export function GetAll(req: RequestWithModels, res: Response) {
  req.models.User
    .find({}, 'userid name')
    .exec()
    .then((users) => {
      
      let userObjectIds = users.map((user) => user._id);
      
      req.models.Team
        .find({ members: { $in: userObjectIds }}, 'teamid name members')
        .populate('members', 'userid')
        .exec()
        .then((teams) => {
          
          let userResponses = users.map((user) => {
            let usersTeam = teams.find((team) => team.members.some((member) => member.userid === user.userid))
            let userResponse: UserResponse.ResourceObject = {
              links: { self: `/users/${encodeURI(user.userid)}` },
              type: 'users',
              id: user.userid,
              attributes: { name: user.name },
              relationships: {
                team: {
                  links: { self: `/users/${encodeURI(user.userid)}/team` },
                  data: usersTeam ? { type: 'teams', id: usersTeam.teamid } : null
                }
              }
            };
            return userResponse;
          });
          
          let includedTeams = teams.map<TeamResponse.ResourceObject>((team) => ({
            links: { self: `/teams/${encodeURI(team.teamid)}` },
            type: 'teams',
            id: team.teamid,
            attributes: { name: team.name },
            relationships: {
              members: {
                links: { self: `/teams/${encodeURI(team.teamid)}/members` },
                data: team.members ? team.members.map((member) => ({ type: 'users', id: member.userid })) : []
              }
            }
          }));
          
          let usersResponse: UsersResponse.TopLevelDocument = {
            links: { self: `/users` },
            data: userResponses,
            included: includedTeams
          };
          
          res.status(200).contentType('application/vnd.api+json').send(usersResponse);    
        }, respond.Send500.bind(res))
    }, respond.Send500.bind(res));
};

export function GetByUserId(req: RequestWithModels, res: Response) {
  if (req.params.userid === undefined || typeof req.params.userid !== 'string')
    return respond.Send400(res);
    
  req.models.User
    .findOne({ userid: req.params.userid }, 'userid name')
    .exec()
    .then((user) => {
      if (!user)
        return respond.Send404(res);
      
      req.models.Team
        .findOne({ members: { $in: [user._id] }}, 'teamid name members')
        .populate('members', 'userid name')
        .exec()
        .then((team) => {
          let userResponse: UserResponse.TopLevelDocument = {
            links: { self: `/users/${encodeURI(user.userid)}` },
            data: {
              type: 'users',
              id: user.userid,
              attributes: { name: user.name },
              relationships: {
                team: {
                  links: { self: `/users/${encodeURI(user.userid)}/team` },
                  data: null
                }
              }
            }
          };
          
          
          if (team) {
            userResponse.data.relationships.team.data = { type: 'teams', id: team.teamid };
            
            let includedTeam: TeamResponse.ResourceObject = {
              links: { self: `/teams/${encodeURI(team.teamid)}` },
              type: 'teams',
              id: team.teamid,
              attributes: { name: team.name },
              relationships: {
                members: {
                  links: { self: `/teams/${encodeURI(team.teamid)}/members` },
                  data: team.members ? team.members.map((member) => ({ type: 'users', id: member.userid })) : []
                }
              }
            }
            
            let includedUsers = team.members
              .filter((member) => member.userid !== user.userid)
              .map<UserResponse.ResourceObject>((member) => ({
                links: { self: `/users/${encodeURI(member.userid)}` },
                type: 'users',
                id: member.userid,
                attributes: { name: member.name },
                relationships: {
                  team: {
                    links: { self: `/teams/${encodeURI(team.teamid)}` },
                    data: { type: 'teams', id: team.teamid }
                  }
                }
              }));
              
            userResponse.included = [includedTeam, ...includedUsers];
          }
          
          res.status(200).contentType('application/vnd.api+json').send(userResponse);    
        }, respond.Send500.bind(res))
    }, respond.Send500.bind(res));
};

export function Create(req: RequestWithModels, res: Response) {
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
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
        return respond.Send409(res);
      return respond.Send500(res, err);
    }
    
    let userResponse: UserResponse.TopLevelDocument = {
      links: {
        self: `/users/${encodeURI(user.userid)}`
      },
      data: {
        type: 'users',
        id: user.userid,
        attributes: {
          name: user.name
        },
        relationships: {
          team: {
            links: {
              self: `/users/${encodeURI(user.userid)}/team`
            },
            data: null
          }
        }
      }
    };
    
    res.status(201).contentType('application/vnd.api+json').send(userResponse);
  });
};