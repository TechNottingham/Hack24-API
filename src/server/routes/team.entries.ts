import * as respond from './respond'
import * as middleware from '../middleware'

import {HackModel, TeamModel} from '../models'
import {Request, Response, Router} from 'express'
import {JSONApi, TeamEntriesRelationship, HackResource} from '../../resources'
import {EventBroadcaster} from '../eventbroadcaster'
import {JsonApiParser} from '../parsers'

export class TeamEntriesRoute {
  private _eventBroadcaster: EventBroadcaster

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this)
    const router = Router()

    router.post('/:teamId/entries', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.add))
    router.delete('/:teamId/entries', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.delete))
    router.get('/:teamId/entries', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get))
    router.options('/:teamId/entries', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))

    return router
  }

  public async get(req: Request, res: Response) {
    const teamId = req.params.teamId

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid entries')
      .populate('entries', 'hackid name')
      .exec()

    if (team === null) {
      return respond.Send404(res)
    }

    const entries = team.entries.map<JSONApi.ResourceIdentifierObject>((hack) => ({
      type: 'hacks',
      id: hack.hackid,
    }))

    const includedHacks = team.entries.map<HackResource.ResourceObject>((hack) => ({
      links: { self: `/hacks/${hack.hackid}` },
      type: 'hacks',
      id: hack.hackid,
      attributes: { name: hack.name },
    }))

    const entriesResponse: TeamEntriesRelationship.TopLevelDocument = {
      links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
      data: entries,
      included: includedHacks,
    }

    respond.Send200(res, entriesResponse)
  };

  public async delete(req: Request, res: Response) {
    const teamId = req.params.teamId
    const requestDoc: TeamEntriesRelationship.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res)
    }

    const errorCases = requestDoc.data.filter((hack) => hack.type !== 'hacks' || typeof hack.id !== 'string')
    if (errorCases.length > 0) {
      return respond.Send400(res)
    }

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid name entries')
      .populate('entries', 'hackid name')
      .exec()

    if (team === null) {
      return respond.Send404(res)
    }

    const hacksToDelete = team.entries.filter((hack) => requestDoc.data.some((hackToDelete) => hack.hackid === hackToDelete.id))

    if (hacksToDelete.length < requestDoc.data.length) {
      return respond.Send400(res)
    }

    const hackIdsToDelete = hacksToDelete.map((hack) => hack.hackid)
    team.entries = team.entries.filter((hack) => hackIdsToDelete.indexOf(hack.hackid) === -1)

    await team.save()

    hacksToDelete.forEach((hack) => {
      this._eventBroadcaster.trigger('teams_update_entries_delete', {
        teamid: team.teamid,
        name: team.name,
        entry: {
          hackid: hack.hackid,
          name: hack.name,
        },
      })
    })

    respond.Send204(res)
  };

  public async add(req: Request, res: Response) {
    const teamId = req.params.teamId
    const requestDoc: TeamEntriesRelationship.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res)
    }

    const errorCases = requestDoc.data.filter((hack) => hack.type !== 'hacks' || typeof hack.id !== 'string')
    if (errorCases.length > 0) {
      return respond.Send400(res)
    }

    const team = await TeamModel
      .findOne({ teamid: teamId }, 'teamid name entries')
      .populate('entries', 'hackid')
      .exec()

    if (team === null) {
      return respond.Send404(res)
    }

    const hackIdsToAdd = requestDoc.data.map((hack) => hack.id)
    const existingHackIds = hackIdsToAdd.filter((hackIdToAdd) => team.entries.some((actualhack) => actualhack.hackid === hackIdToAdd))

    if (existingHackIds.length > 0) {
      return respond.Send400(res, 'One or more hacks are already entries of this team.')
    }

    const hacks = await HackModel
      .find({ hackid: { $in: hackIdsToAdd } }, 'hackid name')
      .exec()

    if (hacks.length !== hackIdsToAdd.length) {
      return respond.Send400(res, 'One or more of the specified hacks could not be found.')
    }

    const hackObjectIds = hacks.map((hack) => hack._id)

    const teams = await TeamModel
      .find({ entries: { $in: hackObjectIds } }, 'teamid')
      .exec()

    if (teams.length > 0) {
      return respond.Send400(res, 'One or more of the specified hacks are already in a team.')
    }

    team.entries = team.entries.concat(hacks.map((hack) => hack._id))

    await team.save()

    hacks.forEach((hack) => {
      this._eventBroadcaster.trigger('teams_update_entries_add', {
        teamid: team.teamid,
        name: team.name,
        entry: {
          hackid: hack.hackid,
          name: hack.name,
        },
      })
    })

    respond.Send204(res)
  }

}
