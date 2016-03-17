"use strict";

import * as respond from './respond';
import * as slug from 'slug';
import * as middleware from '../middleware';

import {Log} from '../logger';
import {UserModel, IUserModel, TeamModel, HackModel, IHackModel} from '../models';
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
  
function AsyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => fn.call(this, req, res).catch((err) => respond.Send500.bind(res));
}

export class TeamsRoute {
  private _eventBroadcaster: EventBroadcaster;
  
  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }
  
  createRouter() {
    const asyncHandler = AsyncHandler.bind(this);
    const router = Router();
    
    router.patch('/:teamId', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.update.bind(this));
    router.get('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, this.get.bind(this));
    router.options('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, this.getAll.bind(this));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.create));
    
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
            },
            entries: {
              links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
              data: null
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
  
  async create(req: Request, res: Response) {
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
    let entries: JSONApi.ResourceIdentifierObject[] = [];

    if (relationships) {
      if (relationships.members && relationships.members.data) {
        if (!Array.isArray(relationships.members.data))
          return respond.Send400(res);
        members = relationships.members.data;
      }
      
      if (relationships.entries && relationships.entries.data) {
        if (!Array.isArray(relationships.entries.data))
          return respond.Send400(res);
        entries = relationships.entries.data;
      }
    }
    
    const team = new TeamModel({
      teamid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      motto: requestDoc.data.attributes.motto || null,
      members: [],
      entries: []
    });
    
    let users: IUserModel[] = [];
    let hacks: IHackModel[] = [];
    
    if (members.length > 0) {
      users = await UserModel.find({
        userid: {
          $in: members.map((member) => member.id.toString())
        }
      }, '_id userid name').exec();
      team.members = users.map((user) => user._id);
    }
    
    if (entries.length > 0) {
      hacks = await HackModel.find({
        hackid: {
          $in: entries.map((entry) => entry.id.toString())
        }
      }, '_id hackid name').exec();
      team.entries = hacks.map((hack) => hack._id);
    }
    
    try {
      await team.save();
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
        return respond.Send409(res);
      throw err;
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
            data: users.map((user) => ({ type: 'users', id: user.userid}))
          },
          entries: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
            data: hacks.map((hack) => ({ type: 'hacks', id: hack.hackid}))
          }
        }
      }
    };
    
    this._eventBroadcaster.trigger('teams_add', {
      teamid: team.teamid,
      name: team.name,
      motto: team.motto,
      members: users.map((user) => ({ userid: user.userid, name: user.name })),
      entries: hacks.map((hack) => ({ hackid: hack.hackid, name: hack.name }))
    });
    
    respond.Send201(res, teamResponse);
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
              },
              entries: {
                links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
                data: null
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
    
    const newMotto = requestDoc.data.attributes.motto.toString();
    const projection = {
      teamid: true,
      name: true,
      motto: true,
      'members.userid': true,
      'members.name': true
    };
      
    TeamModel
      .findOneAndUpdate({ teamid: requestDoc.data.id }, { motto: newMotto }, { select: projection })
      .exec()
      .then((team) => {
        respond.Send204(res);
        
        if (team.motto === newMotto) return;
        
        this._eventBroadcaster.trigger('teams_update_motto', {
          teamid: team.teamid,
          name: team.name,
          motto: newMotto,
          members: team.members.map((member) => ({ userid: member.userid, name: member.name }))
        });
        
      }, respond.Send500.bind(null, res));
  }
  
}
