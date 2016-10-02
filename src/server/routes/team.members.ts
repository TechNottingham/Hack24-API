import * as respond from './respond';
import * as middleware from '../middleware';

import {UserModel, TeamModel} from '../models';
import {Request, Response, Router} from 'express';
import {JSONApi, UserResource, TeamMembersRelationship} from '../../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

export class TeamMembersRoute {
  private _eventBroadcaster: EventBroadcaster;

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this);
    const router = Router();

    router.post('/:teamId/members', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.add));
    router.delete('/:teamId/members', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.delete));
    router.get('/:teamId/members', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get));
    router.options('/:teamId/members', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));

    return router;
  }

  public async get(req: Request, res: Response) {
    const teamId = req.params.teamId;

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid members')
      .populate('members', 'userid name')
      .exec();

    if (team === null) {
      return respond.Send404(res);
    }

    const members = team.members.map<JSONApi.ResourceIdentifierObject>((member) => ({
      type: 'users',
      id: member.userid,
    }));

    const includedUsers = team.members.map<UserResource.ResourceObject>((member) => ({
      links: { self: `/users/${member.userid}` },
      type: 'users',
      id: member.userid,
      attributes: { name: member.name },
    }));

    const membersResponse: TeamMembersRelationship.TopLevelDocument = {
      links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
      data: members,
      included: includedUsers,
    };

    respond.Send200(res, membersResponse);
  };

  public async delete(req: Request, res: Response) {
    const teamId = req.params.teamId;
    const requestDoc: TeamMembersRelationship.TopLevelDocument = req.body;

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res);
    }

    const errorCases = requestDoc.data.filter((member) => member.type !== 'users' || typeof member.id !== 'string');
    if (errorCases.length > 0) {
      return respond.Send400(res);
    }

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid name members')
      .populate('members', 'userid name')
      .exec();

    if (team === null) {
      return respond.Send404(res);
    }

    const usersToDelete = team.members.filter((member) => requestDoc.data.some((memberToDelete) => member.userid === memberToDelete.id));

    if (usersToDelete.length < requestDoc.data.length) {
      return respond.Send400(res);
    }

    const userIdsToDelete = usersToDelete.map((u) => u.userid);
    team.members = team.members.filter((member) => userIdsToDelete.indexOf(member.userid) === -1);

    await team.save();

    usersToDelete.forEach((user) => {
      this._eventBroadcaster.trigger('teams_update_members_delete', {
        teamid: team.teamid,
        name: team.name,
        member: {
          userid: user.userid,
          name: user.name,
        },
      });
    });

    respond.Send204(res);
  };

  public async add(req: Request, res: Response) {
    const teamId = req.params.teamId;
    const requestDoc: TeamMembersRelationship.TopLevelDocument = req.body;

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res);
    }

    const errorCases = requestDoc.data.filter((member) => member.type !== 'users' || typeof member.id !== 'string');
    if (errorCases.length > 0) {
      return respond.Send400(res);
    }

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid name members')
      .populate('members', 'userid')
      .exec();

    if (team === null) {
      return respond.Send404(res);
    }

    const userIdsToAdd = requestDoc.data.map((user) => user.id);
    const existingUserIds = userIdsToAdd.filter((userIdToAdd) => team.members.some((actualMember) => actualMember.userid === userIdToAdd));

    if (existingUserIds.length > 0) {
      return respond.Send400(res, 'One or more users are already members of this team.');
    }

    const users = await UserModel
      .find({ userid: { $in: userIdsToAdd } }, 'userid name')
      .exec();

    if (users.length !== userIdsToAdd.length) {
      return respond.Send400(res, 'One or more of the specified users could not be found.');
    }

    const userObjectIds = users.map((user) => user._id);

    const teams = await TeamModel
      .find({ members: { $in: userObjectIds } }, 'teamid')
      .exec();

    if (teams.length > 0) {
      return respond.Send400(res, 'One or more of the specified users are already in a team.');
    }

    team.members = team.members.concat(users.map((user) => user._id));

    await team.save();

    users.forEach(user => {
      this._eventBroadcaster.trigger('teams_update_members_add', {
        teamid: team.teamid,
        name: team.name,
        member: {
          userid: user.userid,
          name: user.name,
        },
      });
    });

    respond.Send204(res);
  }

}
