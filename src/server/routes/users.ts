"use strict";

import * as respond from './respond';
import * as middleware from '../middleware';

import {UserModel, TeamModel} from '../models';
import {Request, Response, Router} from 'express';
import {MongoDBErrors} from '../models';
import {UserResource, UsersResource, TeamResource} from '../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

export class UsersRoute {
  private _eventBroadcaster: EventBroadcaster;
  
  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }
  
  createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this);
    const router = Router();
    
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.getAll));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.create));
    router.get('/:userId', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get));
    router.options('/:userId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    
    return router;
  }
  
  async getAll(req: Request, res: Response) {
    const users = await UserModel
      .find({}, 'userid name')
      .sort({ userid: 1 })
      .exec();
      
    const userObjectIds = users.map((user) => user._id);

    const teams = await TeamModel
      .find({ members: { $in: userObjectIds } }, 'teamid name motto members')
      .populate('members', 'userid')
      .exec();

    const userResponses = users.map((user) => {
      const usersTeam = teams.find((team) => team.members.some((member) => member.userid === user.userid))
      const userResponse: UserResource.ResourceObject = {
        links: { self: `/users/${encodeURIComponent(user.userid)}` },
        type: 'users',
        id: user.userid,
        attributes: { name: user.name },
        relationships: {
          team: {
            links: { self: `/users/${encodeURIComponent(user.userid)}/team` },
            data: usersTeam ? { type: 'teams', id: usersTeam.teamid } : null
          }
        }
      };
      return userResponse;
    });

    const includedTeams = teams.map<TeamResource.ResourceObject>((team) => ({
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
          data: team.members ? team.members.map((member) => ({ type: 'users', id: member.userid })) : []
        },
        entries: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
          data: null
        }
      }
    }));

    const usersResponse = <UsersResource.TopLevelDocument> {
      links: { self: '/users' },
      data: userResponses,
      included: includedTeams
    };
    
    respond.Send200(res, usersResponse);
  }

  async get(req: Request, res: Response) {
    if (req.params.userId === undefined || typeof req.params.userId !== 'string')
      return respond.Send400(res);

    const user = await UserModel
      .findOne({ userid: req.params.userId }, 'userid name')
      .exec();
      
    if (!user)
      return respond.Send404(res);

    const team = await TeamModel
      .findOne({ members: { $in: [user._id] } }, 'teamid name members motto')
      .populate('members', 'userid name')
      .exec();
      
    const userResponse = <UserResource.TopLevelDocument> {
      links: { self: `/users/${encodeURIComponent(user.userid)}` },
      data: {
        type: 'users',
        id: user.userid,
        attributes: { name: user.name },
        relationships: {
          team: {
            links: { self: `/users/${encodeURIComponent(user.userid)}/team` },
            data: null
          }
        }
      }
    };

    if (team) {
      userResponse.data.relationships.team.data = { type: 'teams', id: team.teamid };

      const includedTeam = <TeamResource.ResourceObject> {
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
            data: team.members ? team.members.map((member) => ({ type: 'users', id: member.userid })) : []
          },
          entries: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
            data: null
          }
        }
      }

      const includedUsers = team.members
        .filter((member) => member.userid !== user.userid)
        .map<UserResource.ResourceObject>((member) => ({
          links: { self: `/users/${encodeURIComponent(member.userid)}` },
          type: 'users',
          id: member.userid,
          attributes: { name: member.name },
          relationships: {
            team: {
              links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
              data: { type: 'teams', id: team.teamid }
            }
          }
        }));

      userResponse.included = [includedTeam, ...includedUsers];
    }

    res.status(200).contentType('application/vnd.api+json').send(userResponse);
  }

  async create(req: Request, res: Response) {
    const requestDoc: UserResource.TopLevelDocument = req.body;
    
    if (!requestDoc 
      || !requestDoc.data
      || !requestDoc.data.id
      || typeof requestDoc.data.id !== 'string'
      || !requestDoc.data.type
      || requestDoc.data.type !== 'users'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string')
      return respond.Send400(res);

    const user = new UserModel({
      userid: requestDoc.data.id,
      name: requestDoc.data.attributes.name
    });
    
    try {
      await user.save();
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
        return respond.Send409(res);
      throw err;
    }

    const userResponse = <UserResource.TopLevelDocument> {
      links: {
        self: `/users/${encodeURIComponent(user.userid)}`
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
              self: `/users/${encodeURIComponent(user.userid)}/team`
            },
            data: null
          }
        }
      }
    };

    this._eventBroadcaster.trigger('users_add', {
      userid: user.userid,
      name: user.name
    });
      
    respond.Send201(res, userResponse);
  }

}
