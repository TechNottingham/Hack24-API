"use strict";

import {Request, Response} from 'express';
import {IModels, ITeamModel, MongoDBErrors} from '../models';
import * as respond from './respond';
import {JSONApi, TeamResource, TeamsResource, UserResource, TeamMembersRelationship} from '../resources';
import * as slug from 'slug';
import {Log} from '../logger'
import {Pusher} from 'pusher'

declare interface RequestWithModels extends Request {
  models: IModels
}

function slugify(name: string): string {
  return slug(name, { lower: true });
}

function escapeForRegex(str: string): string {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};


export class TeamsEndpoint {
  private static _pusher: Pusher;
  
  static set Pusher(pusher: Pusher) {
    this._pusher = pusher;
  }
  
  private static trigger(event: string, data: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._pusher.trigger('api_events', event, data, null, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } 

  static GetAll(req: RequestWithModels, res: Response) {
    let query: any = {};
    
    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i');
    }
    
    req.models.Team
      .find(query, 'teamid name motto members')
      .sort({ teamid: 1 })
      .populate('members', 'userid name')
      .exec()
      .then((teams) => {
        
        const teamResponses = teams.map<TeamResource.ResourceObject>((team) => ({
          links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: team.name,
            motto: team.motto || null
          },
          relationships: {
            members: {
              links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
              data: team.members.map((member) => ({ type: 'users', id: member.userid }))
            }
          }
        }));
        
        req.models.Team
          .count({})
          .exec()
          .then((totalCount) => {
            
            const includedUsers = teams.map((team) => team.members.map<UserResource.ResourceObject>((member) => ({
              links: { self: `/users/${member.userid}` },
              type: 'users',
              id: member.userid,
              attributes: { name: member.name }
            })));
            
            const teamsResponse: TeamsResource.TopLevelDocument = {
              links: { self: `/teams` },
              data: teamResponses,
              included: [].concat.apply([], includedUsers)
            };
            respond.Send200(res, teamsResponse);
            
          }, respond.Send500.bind(null, res));
      }, respond.Send500.bind(null, res));
  }
  
  static Create(req: RequestWithModels, res: Response) {
    const requestDoc: TeamResource.TopLevelDocument = req.body;
    
    if (!requestDoc 
      || !requestDoc.data
      || requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'teams'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string')
      return respond.Send400(res);
      
    const relationships = requestDoc.data.relationships;
    let members: JSONApi.ResourceIdentifierObject[] = [];

    if (relationships) {
      if (!relationships.members
        || !relationships.members.data
        || (relationships.members.data !== null && !Array.isArray(relationships.members.data)))
        return respond.Send400(res);
      
      members = relationships.members.data;
    }
    
    const team = new req.models.Team({
      teamid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      motto: requestDoc.data.attributes.motto || null,
      members: []
    });
    
    if (members.length === 0) {
      return team.save((err, result) => {
        if (err) {
          if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
            return respond.Send409(res);
          return respond.Send500(res, err);
        }
        
        const teamResponse: TeamResource.TopLevelDocument = {
          links: {
            self: `/teams/${encodeURIComponent(team.teamid)}`
          },
          data: {
            type: 'teams',
            id: team.teamid,
            attributes: {
              name: team.name,
              motto: team.motto
            },
            relationships: {
              members: {
                links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
                data: null
              }
            }
          }
        };
        
        TeamsEndpoint.trigger('team_add', {
          teamid: team.teamid,
          name: team.name,
          motto: team.motto
        }).then(() => {
          respond.Send201(res, teamResponse);
        }).catch(respond.Send500.bind(null));
        
      });
    }
    
    const membersQuery = {
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
            .populate('members', 'userid name')
            .exec()
            .then((team) => {
              const teamResponse: TeamResource.TopLevelDocument = {
                links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
                data: {
                  type: 'teams',
                  id: team.teamid,
                  attributes: {
                    name: team.name,
                    motto: team.motto
                  },
                  relationships: {
                    members: {
                      links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
                      data: team.members.map((member) => ({ type: 'users', id: member.userid}))
                    }
                  }
                }
              };
              
        
              TeamsEndpoint.trigger('team_add', {
                teamid: team.teamid,
                name: team.name,
                motto: team.motto,
                members: team.members.map((member) => ({ userid: member.userid, name: member.name }))
              }).then(() => {
                respond.Send201(res, teamResponse);
              }).catch(respond.Send500.bind(null));
              
            }, respond.Send500.bind(null, res));
        });
        
      }, respond.Send500.bind(null, res));
  }
  
}


export function Get(req: RequestWithModels, res: Response) {
  const teamId = req.params.teamId;
  
  req.models.Team
    .findOne({ teamid: teamId }, 'teamid name motto members')
    .populate('members', 'userid name')
    .exec()
    .then((team) => {
      if (team === null)
        return respond.Send404(res);
        
      const includedUsers = team.members.map<UserResource.ResourceObject>((member) => ({
        links: { self: `/users/${member.userid}` },
        type: 'users',
        id: member.userid,
        attributes: { name: member.name }
      }));
        
      const teamResponse: TeamResource.TopLevelDocument = {
        links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: team.name,
            motto: team.motto || null
          },
          relationships: {
            members: {
              links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
              data: team.members.map((member) => ({ type: 'users', id: member.userid }))
            }
          }
        },
        included: includedUsers
      };
      respond.Send200(res, teamResponse);
    }, respond.Send500.bind(null, res));
};

export function Update(req: RequestWithModels, res: Response) {
  const teamId = req.params.teamId;
  const requestDoc: TeamResource.TopLevelDocument = req.body;
  
  if (!requestDoc 
    || !requestDoc.data
    || !requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'teams')
    return respond.Send400(res);
  
  if (teamId !== requestDoc.data.id)
    return respond.Send400(res, `The id '${teamId}' does not match the document id '${requestDoc.data.id}'.`);
  
  if (requestDoc.data.attributes === undefined)
    return respond.Send204(res);
  
  if (requestDoc.data.attributes.motto === undefined)
    return respond.Send204(res);
    
  Log.info(`Modifying team "${teamId}" motto to "${requestDoc.data.attributes.motto}"`);
    
  req.models.Team
    .findOneAndUpdate({ teamid: requestDoc.data.id }, { motto: requestDoc.data.attributes.motto.toString() })
    .exec()
    .then((team) => respond.Send204(res), respond.Send500.bind(null, res));
};