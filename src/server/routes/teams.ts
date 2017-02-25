import * as respond from './respond';
import * as slug from 'slug';
import * as middleware from '../middleware';

import {Log} from '../logger';
import {UserModel, TeamModel, HackModel, MongoDBErrors} from '../models';
import {Request, Response, Router} from 'express';
import {JSONApi, TeamResource, TeamsResource, UserResource, HackResource, ChallengeResource} from '../../resources';
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

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this);
    const router = Router();

    router.patch('/:teamId', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.update));
    router.get('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get));
    router.delete('/:teamId', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.delete));
    router.options('/:teamId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.getAll));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.create));

    return router;
  }

  public async getAll(req: Request, res: Response) {
    let query: any = {};

    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i');
    }

    const teams = await TeamModel
      .find(query, 'teamid name motto members entries')
      .sort({ teamid: 1 })
      .populate({
        path: 'members',
        select: 'userid name',
      })
      .populate({
        path: 'entries',
        select: 'hackid name challenges',
        populate: {
          path: 'challenges',
          select: 'challengeid name',
        },
      })
      .exec();

    const teamResponses = teams.map<TeamResource.ResourceObject>((team) => ({
      links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
      type: 'teams',
      id: team.teamid,
      attributes: {
        name: team.name,
        motto: team.motto || null,
      },
      relationships: {
        members: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
          data: team.members.map((member) => ({ type: 'users', id: member.userid })),
        },
        entries: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
          data: team.entries.map((hack) => ({ type: 'hacks', id: hack.hackid })),
        },
      },
    }));

    const includes = teams.reduce((docs, team) => {
      const members = team.members.map<UserResource.ResourceObject>((member) => ({
        links: { self: `/users/${member.userid}` },
        type: 'users',
        id: member.userid,
        attributes: { name: member.name },
      }));

      const entries = team.entries.map<HackResource.ResourceObject>((hack) => ({
        links: { self: `/hacks/${hack.hackid}` },
        type: 'hacks',
        id: hack.hackid,
        attributes: { name: hack.name },
        relationships: {
          challenges: {
            links: { self: `/hacks/${encodeURIComponent(hack.hackid)}/challenges` },
            data: hack.challenges.map((challenge) => ({ type: 'challenges', id: challenge.challengeid })),
          },
        },
      }));

      const challenges = team.entries.reduce<ChallengeResource.ResourceObject[]>((previous, hack) => {
        const these = hack.challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
          links: { self: `/challenges/${challenge.challengeid}` },
          type: 'challenges',
          id: challenge.challengeid,
          attributes: { name: challenge.name },
        }));
        return [...previous, ...these];
      }, []);

      return [...docs, ...members, ...entries, ...challenges];
    }, []);

    const teamsResponse: TeamsResource.TopLevelDocument = {
      links: { self: `/teams` },
      data: teamResponses,
      included: includes,
    };

    respond.Send200(res, teamsResponse);
  }

  public async create(req: Request, res: Response) {
    const requestDoc: TeamResource.TopLevelDocument = req.body;

    if (!requestDoc
      || !requestDoc.data
      || requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'teams'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string') {
      return respond.Send400(res);
    }

    const relationships = requestDoc.data.relationships;
    let members: JSONApi.ResourceIdentifierObject[] = [];
    let entries: JSONApi.ResourceIdentifierObject[] = [];

    if (relationships) {
      if (relationships.members && relationships.members.data) {
        if (!Array.isArray(relationships.members.data)) {
          return respond.Send400(res);
        }
        members = relationships.members.data;
      }

      if (relationships.entries && relationships.entries.data) {
        if (!Array.isArray(relationships.entries.data)) {
          return respond.Send400(res);
        }
        entries = relationships.entries.data;
      }
    }

    const team = new TeamModel({
      teamid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      motto: requestDoc.data.attributes.motto || null,
      members: [],
      entries: [],
    });

    let users: UserModel[] = [];
    let hacks: HackModel[] = [];

    if (members.length > 0) {
      users = await UserModel.find({
        userid: {
          $in: members.map((member) => member.id.toString()),
        },
      }, '_id userid name').exec();
      team.members = users.map((user) => user._id);
    }

    if (entries.length > 0) {
      hacks = await HackModel.find({
        hackid: {
          $in: entries.map((entry) => entry.id.toString()),
        },
      }, '_id hackid name').exec();
      team.entries = hacks.map((hack) => hack._id);
    }

    try {
      await team.save();
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
        return respond.Send409(res);
      }
      throw err;
    }

    const teamResponse: TeamResource.TopLevelDocument = {
      links: {
        self: `/teams/${encodeURIComponent(team.teamid)}`,
      },
      data: {
        type: 'teams',
        id: team.teamid,
        attributes: {
          name: team.name,
          motto: team.motto,
        },
        relationships: {
          members: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
            data: users.map((user) => ({ type: 'users', id: user.userid })),
          },
          entries: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
            data: hacks.map((hack) => ({ type: 'hacks', id: hack.hackid })),
          },
        },
      },
    };

    this._eventBroadcaster.trigger('teams_add', {
      teamid: team.teamid,
      name: team.name,
      motto: team.motto,
      members: users.map((user) => ({ userid: user.userid, name: user.name })),
      entries: hacks.map((hack) => ({ hackid: hack.hackid, name: hack.name })),
    });

    respond.Send201(res, teamResponse);
  }

  public async get(req: Request, res: Response) {
    const teamId = req.params.teamId;

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid name motto members entries')
      .populate({
        path: 'members',
        select: 'userid name',
      })
      .populate({
        path: 'entries',
        select: 'hackid name challenges',
        populate: {
          path: 'challenges',
          select: 'challengeid name',
        },
      })
      .exec();

    if (team === null) {
      return respond.Send404(res);
    }

    const includedUsers = team.members.map<UserResource.ResourceObject>((user) => ({
      links: { self: `/users/${user.userid}` },
      type: 'users',
      id: user.userid,
      attributes: { name: user.name },
    }));

    const includedHacks = team.entries.map<HackResource.ResourceObject>((hack) => ({
      links: { self: `/hacks/${hack.hackid}` },
      type: 'hacks',
      id: hack.hackid,
      attributes: { name: hack.name },
      relationships: {
        challenges: {
          links: { self: `/hacks/${encodeURIComponent(hack.hackid)}/challenges` },
          data: hack.challenges.map((challenge) => ({ type: 'challenges', id: challenge.challengeid })),
        },
      },
    }));

    const includedChallenges = team.entries.reduce<ChallengeResource.ResourceObject[]>((previous, hack) => {
      const these = hack.challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
        links: { self: `/challenges/${challenge.challengeid}` },
        type: 'challenges',
        id: challenge.challengeid,
        attributes: { name: challenge.name },
      }));
      return [...previous, ...these];
    }, []);

    const result: TeamResource.TopLevelDocument = {
      links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
      data: {
        type: 'teams',
        id: team.teamid,
        attributes: {
          name: team.name,
          motto: team.motto || null,
        },
        relationships: {
          members: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
            data: team.members.map((member) => ({ type: 'users', id: member.userid })),
          },
          entries: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
            data: team.entries.map((hack) => ({ type: 'hacks', id: hack.hackid })),
          },
        },
      },
      included: [...includedUsers, ...includedHacks, ...includedChallenges],
    };

    respond.Send200(res, result);
  }

  public async update(req: Request, res: Response) {
    const teamId = req.params.teamId;
    const requestDoc: TeamResource.TopLevelDocument = req.body;

    if (!requestDoc
      || !requestDoc.data
      || !requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'teams') {
      return respond.Send400(res);
    }

    if (teamId !== requestDoc.data.id) {
      return respond.Send400(res, `The id '${teamId}' does not match the document id '${requestDoc.data.id}'.`);
    }

    if (requestDoc.data.attributes === undefined) {
      return respond.Send204(res);
    }

    if (requestDoc.data.attributes.motto === undefined) {
      return respond.Send204(res);
    }

    Log.info(`Modifying team "${teamId}" motto to "${requestDoc.data.attributes.motto}"`);

    const newMotto = requestDoc.data.attributes.motto.toString();
    const projection = {
      "teamid": true,
      "name": true,
      "motto": true,
      'members.userid': true,
      'members.name': true,
    };

    TeamModel
      .findOneAndUpdate({ teamid: requestDoc.data.id }, { motto: newMotto }, { select: projection })
      .exec()
      .then((team) => {
        respond.Send204(res);

        if (team.motto === newMotto) {
          return;
        }

        this._eventBroadcaster.trigger('teams_update_motto', {
          teamid: team.teamid,
          name: team.name,
          motto: newMotto,
          members: team.members.map((member) => ({ userid: member.userid, name: member.name })),
        });

      }, respond.Send500.bind(null, res));
  }

  public async delete(req: Request, res: Response) {
    const teamId = req.params.teamId;

    const team = await TeamModel.findOne({ teamid: teamId }).exec();

    if (team.members.length > 0) {
      return respond.Send400(res, 'Only empty teams can be deleted');
    }

    await TeamModel.remove({ teamid: teamId }).exec();

    respond.Send204(res);
  }

}
