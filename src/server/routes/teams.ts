"use strict";

import {Request, Response} from 'express';
import {IModels, ITeamModel, MongoDBErrors} from '../models';
import * as respond from './respond';
import {JSONApi, TeamResource, TeamsResource} from '../resources';
import * as slug from 'slug';

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

export function GetAll(req: RequestWithModels, res: Response) {
  
  req.models.Team
    .find({}, 'teamid name members')
    .sort({ teamid: 1 })
    .populate('members', 'userid')
    .exec()
    .then((teams) => {
      
      let teamResponses = teams.map<TeamResource.ResourceObject>((team) => ({
        links: { self: `/teams/${encodeURI(team.teamid)}` },
        type: 'teams',
        id: team.teamid,
        attributes: {
          name: team.name
        },
        relationships: {
          members: {
            links: { self: `/teams/${encodeURI(team.teamid)}/members` },
            data: team.members.map((member) => ({ type: 'users', id: member.userid }))
          }
        }
      }));
      
      req.models.Team
        .count({})
        .exec()
        .then((totalCount) => {
          
          let teamsResponse: TeamsResource.TopLevelDocument = {
            links: { self: `/teams` },
            data: teamResponses
          };
          respond.Send200(res, teamsResponse);
          
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
      let teamResponse: TeamResource.TopLevelDocument = {
        links: { self: `/teams/${encodeURI(team.teamid)}` },
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: team.name
          },
          relationships: {
            members: {
              links: { self: `/teams/${encodeURI(team.teamid)}/members` },
              data: team.members.map((member) => ({ type: 'users', id: member.userid }))
            }
          }
        }
      };
      respond.Send200(res, teamResponse);
    }, respond.Send500.bind(res));
};

export function Create(req: RequestWithModels, res: Response) {
  let requestDoc: TeamResource.TopLevelDocument = req.body;
  
  if (!requestDoc 
    || !requestDoc.data
    || requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'teams'
    || !requestDoc.data.attributes
    || !requestDoc.data.attributes.name
    || typeof requestDoc.data.attributes.name !== 'string')
    return respond.Send400(res);
    
  let relationships = requestDoc.data.relationships;
  let members: JSONApi.ResourceIdentifierObject[] = [];

  if (relationships) {
    if (!relationships.members
      || !relationships.members.data
      || (relationships.members.data !== null && !Array.isArray(relationships.members.data)))
      return respond.Send400(res);
    
    members = relationships.members.data;
  }
  
  let team = new req.models.Team({
    teamid: slugify(requestDoc.data.attributes.name),
    name: requestDoc.data.attributes.name,
    members: []
  });
  
  if (members.length === 0) {
    return team.save((err, result) => {
      if (err) {
        if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
          return respond.Send409(res);
        return respond.Send500(res, err);
      }
      
      let teamResponse: TeamResource.TopLevelDocument = {
        links: {
          self: `/teams/${encodeURI(team.teamid)}`
        },
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: team.name
          },
          relationships: {
            members: {
              links: { self: `/teams/${encodeURI(team.teamid)}/members` },
              data: null
            }
          }
        }
      };

      respond.Send201(res, teamResponse);
    });
  }
  
  let membersQuery = {
    userid: {
      $in: members.map((member) => member.id.toString())
    }
  };
    
  req.models.User
    .find(membersQuery, '_id')
    .exec()
    .then((users) => {
      team.members = users.map((user) => user._id)
      
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
            let teamResponse: TeamResource.TopLevelDocument = {
              links: { self: `/teams/${encodeURI(team.teamid)}` },
              data: {
                type: 'teams',
                id: team.teamid,
                attributes: {
                  name: team.name
                },
                relationships: {
                  members: {
                    links: { self: `/teams/${encodeURI(team.teamid)}/members` },
                    data: team.members.map((member) => ({ type: 'users', id: member.userid}))
                  }
                }
              }
            };
            respond.Send201(res, teamResponse);
          }, respond.Send500.bind(res));
      });
      
    }, respond.Send500.bind(res));
};