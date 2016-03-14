"use strict";

import * as respond from './respond';
import * as slug from 'slug';
import * as middleware from '../middleware';

import {Log} from '../logger';
import {UserModel, TeamModel} from '../models';
import {Request, Response, Router} from 'express';
import {ITeamModel, MongoDBErrors} from '../models';
import {JSONApi, TeamResource, TeamsResource, UserResource} from '../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

function slugify(name: string): string {
  return slug(name, { lower: true });
}

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export class TeamsRoute {
  private _eventBroadcaster: EventBroadcaster;
  
  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }
  
  createRouter() {
    const router = Router();
    router.patch('/:teamId', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.update.bind(this));
    router.get('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, this.get.bind(this));
    router.options('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, this.getAll.bind(this));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.create.bind(this));
    
    return router;
  }

  getAll(req: Request, res: Response) {
    let query: any = {};
    
    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i');
    }
    
    TeamModel
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
        
        TeamModel
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
  
  create(req: Request, res: Response) {
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
    
    const team = new TeamModel({
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
        
        this._eventBroadcaster.trigger('teams_add', {
          teamid: team.teamid,
          name: team.name,
          motto: team.motto
        });
        
        respond.Send201(res, teamResponse);
      });
    }
    
    const membersQuery = {
      userid: {
        $in: members.map((member) => member.id.toString())
      }
    };
      
    UserModel
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
          
          TeamModel
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
              
              this._eventBroadcaster.trigger('teams_add', {
                teamid: team.teamid,
                name: team.name,
                motto: team.motto,
                members: team.members.map((member) => ({ userid: member.userid, name: member.name }))
              });
              
              respond.Send201(res, teamResponse);
            }, respond.Send500.bind(null, res));
        });
        
      }, respond.Send500.bind(null, res));
  }

  get(req: Request, res: Response) {
    const teamId = req.params.teamId;
    
    TeamModel
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
  }

  update(req: Request, res: Response) {
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
      
    TeamModel
      .findOneAndUpdate({ teamid: requestDoc.data.id }, { motto: requestDoc.data.attributes.motto.toString() })
      .exec()
      .then((team) => respond.Send204(res), respond.Send500.bind(null, res));
  }
  
}
