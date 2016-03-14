"use strict";

import * as respond from './respond';
import * as middleware from '../middleware';

import {UserModel, TeamModel} from '../models';
import {Request, Response, Router} from 'express';
import {JSONApi, UserResource, TeamMembersRelationship} from '../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

export class TeamMembersRoute {
  private _eventBroadcaster: EventBroadcaster;
  
  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }
  
  createRouter() {
    const router = Router();
    router.post('/:teamId/members', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.add.bind(this));
    router.delete('/:teamId/members', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.delete.bind(this));
    router.get('/:teamId/members', this.get.bind(this));
    
    return router;
  }

  get(req: Request, res: Response) {
    let teamId = req.params.teamId;
    TeamModel
      .findOne({ teamid: teamId }, 'teamid members')
      .populate('members', 'userid name')
      .exec()
      .then((team) => {
        if (team === null)
          return respond.Send404(res);
          
        let members = team.members.map<JSONApi.ResourceIdentifierObject>((member) => ({
          type: 'users',
          id: member.userid
        }));
          
        let includedUsers = team.members.map<UserResource.ResourceObject>((member) => ({
          links: { self: `/users/${member.userid}` },
          type: 'users',
          id: member.userid,
          attributes: { name: member.name }
        }));
          
        let membersResponse: TeamMembersRelationship.TopLevelDocument = {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
          data: members,
          included: includedUsers
        };
        respond.Send200(res, membersResponse);
      }, respond.Send500.bind(null, res));
  };

  delete(req: Request, res: Response) {
    let teamId = req.params.teamId;
    let requestDoc: TeamMembersRelationship.TopLevelDocument = req.body;
    
    if (!requestDoc 
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data)))
      return respond.Send400(res);
    
    let errorCases = requestDoc.data.filter((member) => member.type !== 'users' || typeof member.id !== 'string');
    if (errorCases.length > 0)
      return respond.Send400(res);
    
    TeamModel
      .findOne({ teamid: teamId }, 'teamid members')
      .populate('members', 'userid')
      .exec()
      .then((team) => {
        if (team === null)
          return respond.Send404(res);
          
        let userIdsToDelete = requestDoc.data.filter((memberToDelete) => {
          return team.members.some((actualMember) => actualMember.userid === memberToDelete.id);
        }).map((m) => m.id);
        
        if (userIdsToDelete.length < requestDoc.data.length)
          return respond.Send400(res);
          
        team.members = team.members.filter((member) => userIdsToDelete.indexOf(member.userid) === -1);
        
        team.save((err, result) => {
          if (err)
            return respond.Send500(res, err);

          respond.Send204(res);
        });
        
      }, respond.Send500.bind(null, res));
  };

  add(req: Request, res: Response) {
    let teamId = req.params.teamId;
    let requestDoc: TeamMembersRelationship.TopLevelDocument = req.body;
    
    if (!requestDoc 
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data)))
      return respond.Send400(res);
    
    let errorCases = requestDoc.data.filter((member) => member.type !== 'users' || typeof member.id !== 'string');
    if (errorCases.length > 0)
      return respond.Send400(res);
    
    TeamModel
      .findOne({ teamid: teamId }, 'teamid members')
      .populate('members', 'userid')
      .exec()
      .then((team) => {
        if (team === null)
          return respond.Send404(res);
          
        const userIdsToAdd = requestDoc.data.map((user) => user.id);
          
        const existingUserIds = userIdsToAdd.filter((userIdToAdd) => {
          return team.members.some((actualMember) => actualMember.userid === userIdToAdd);
        });
        
        if (existingUserIds.length > 0)
          return respond.Send400(res, 'One or more users are already members of this team.');
        
        UserModel
          .find({ userid: { $in: userIdsToAdd } }, 'userid')
          .exec()
          .then((users) => {
            if (users.length !== userIdsToAdd.length)
              return respond.Send400(res, 'One or more of the specified users could not be found.');
              
            const userObjectIds = users.map((user) => user._id);
              
            TeamModel
              .find({ members: { $in: userObjectIds }}, 'teamid')
              .exec()
              .then((teams) => {
                if (teams.length > 0)
                  return respond.Send400(res, 'One or more of the specified users are already in a team.');
            
                team.members = team.members.concat(users.map((user) => user._id));
                
                team.save((err, result) => {
                  if (err)
                    return respond.Send500(res, err);

                  respond.Send204(res);
                });
                
              })
          });
        
      }, respond.Send500.bind(null, res));
  }

}
