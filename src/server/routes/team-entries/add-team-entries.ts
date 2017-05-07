import { Request, IReply } from 'hapi'
import { TeamModel, HackModel } from '../../models'
import { TeamEntriesRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId
  const requestDoc: TeamEntriesRelationship.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
    reply(Boom.badRequest())
    return
  }

  const errorCases = requestDoc.data.filter((hack) => hack.type !== 'hacks' || typeof hack.id !== 'string')
  if (errorCases.length > 0) {
    reply(Boom.badRequest())
    return
  }

  const team = await TeamModel
    .findOne({ teamid: teamId }, 'teamid name entries')
    .populate('entries', 'hackid')
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const hackIdsToAdd = requestDoc.data.map((hack) => hack.id)
  const existingHackIds = hackIdsToAdd.filter((hackIdToAdd) => team.entries.some((actualhack) => actualhack.hackid === hackIdToAdd))

  if (existingHackIds.length > 0) {
    reply(Boom.badRequest('One or more hacks are already entries of this team'))
    return
  }

  const hacks = await HackModel
    .find({ hackid: { $in: hackIdsToAdd } }, 'hackid name')
    .exec()

  if (hacks.length !== hackIdsToAdd.length) {
    reply(Boom.badRequest('One or more of the specified hacks could not be found'))
    return
  }

  const hackObjectIds = hacks.map((hack) => hack._id)

  const teams = await TeamModel
    .find({ entries: { $in: hackObjectIds } }, 'teamid')
    .exec()

  if (teams.length > 0) {
    reply(Boom.badRequest('One or more of the specified hacks are already in a team'))
    return
  }

  team.entries = team.entries.concat(hacks.map((hack) => hack._id))

  await team.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  hacks.forEach((hack) => {
    eventBroadcaster.trigger('teams_update_entries_add', {
      teamid: team.teamid,
      name: team.name,
      entry: {
        hackid: hack.hackid,
        name: hack.name,
      },
    }, req.logger)
  })

  reply().code(204)
}
