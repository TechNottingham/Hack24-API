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
    const router = Router();
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, this.getAll.bind(this));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.create.bind(this));
    router.get('/:userId', middleware.allowAllOriginsWithGetAndHeaders, this.get.bind(this));
    router.options('/:userId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    
    return router;
  }
  
  getAll(req: Request, res: Response) {
    UserModel
      .find({}, 'userid name')
      .sort({ userid: 1 })
      .exec()
      .then((users) => {

        const userObjectIds = users.map((user) => user._id);

        TeamModel
          .find({ members: { $in: userObjectIds } }, 'teamid name motto members')
          .populate('members', 'userid')
          .exec()
          .then((teams) => {

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
          }, respond.Send500.bind(null, res))
      }, respond.Send500.bind(null, res));
  }

  get(req: Request, res: Response) {
    if (req.params.userId === undefined || typeof req.params.userId !== 'string')
      return respond.Send400(res);

    UserModel
      .findOne({ userid: req.params.userId }, 'userid name')
      .exec()
      .then((user) => {
        if (!user)
          return respond.Send404(res);

        TeamModel
          .findOne({ members: { $in: [user._id] } }, 'teamid name members motto')
          .populate('members', 'userid name')
          .exec()
          .then((team) => {
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
          }, respond.Send500.bind(null, res))
      }, respond.Send500.bind(null, res));
  }

  create(req: Request, res: Response) {
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

    user.save((err) => {
      if (err) {
        if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
          return respond.Send409(res);

        return respond.Send500(res);
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

      respond.Send201(res, userResponse);
        
      this._eventBroadcaster.trigger('users_add', {
        userid: user.userid,
        name: user.name
      });
      
    });
  }

}
