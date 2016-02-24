"use strict";

import {Request, Response} from 'express'
import {IUserModel, ITeamModel, IModels, MongoDBErrors} from '../models'
import * as respond from './respond';
import {UserResource, UsersResource, TeamResource} from '../resources';

declare interface RequestWithModels extends Request {
  models: IModels
}

export function GetAll(req: RequestWithModels, res: Response) {
  req.models.User
    .find({}, 'userid name')
    .sort({ userid: 1 })
    .exec()
    .then((users) => {

      let userObjectIds = users.map((user) => user._id);

      req.models.Team
        .find({ members: { $in: userObjectIds } }, 'teamid name members')
        .populate('members', 'userid')
        .exec()
        .then((teams) => {

          let userResponses = users.map((user) => {
            let usersTeam = teams.find((team) => team.members.some((member) => member.userid === user.userid))
            let userResponse: UserResource.ResourceObject = {
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

          let includedTeams = teams.map<TeamResource.ResourceObject>((team) => ({
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

          let usersResponse: UsersResource.TopLevelDocument = {
            links: { self: `/users` },
            data: userResponses,
            included: includedTeams
          };

          respond.Send200(res, usersResponse);
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
        .findOne({ members: { $in: [user._id] } }, 'teamid name members')
        .populate('members', 'userid name')
        .exec()
        .then((team) => {
          let userResponse: UserResource.TopLevelDocument = {
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

            let includedTeam: TeamResource.ResourceObject = {
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
              .map<UserResource.ResourceObject>((member) => ({
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
  let requestDoc: UserResource.TopLevelDocument = req.body;

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

  const user = new req.models.User({
    userid: requestDoc.data.id,
    name: requestDoc.data.attributes.name
  });

  user.save((err) => {
    if (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
        return respond.Send409(res);

      return respond.Send500(res);
    }

    let userResponse: UserResource.TopLevelDocument = {
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

    respond.Send201(res, userResponse);
  });
};