import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
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
    .populate('entries', 'hackid name')
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const hacksToDelete = team.entries.filter((hack) => requestDoc.data.some((hackToDelete) => hack.hackid === hackToDelete.id))

  if (hacksToDelete.length < requestDoc.data.length) {
    reply(Boom.badRequest())
    return
  }

  const hackIdsToDelete = hacksToDelete.map((hack) => hack.hackid)
  team.entries = team.entries.filter((hack) => hackIdsToDelete.indexOf(hack.hackid) === -1)

  await team.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  hacksToDelete.forEach((hack) => {
    eventBroadcaster.trigger('teams_update_entries_delete', {
      teamid: team.teamid,
      name: team.name,
      entry: {
        hackid: hack.hackid,
        name: hack.name,
      },
    })
  })

  reply().code(204)
}
