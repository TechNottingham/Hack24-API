import { Request, IReply } from 'hapi'
import * as Boom from '../../boom'
import { TeamModel } from '../../models'
import { TeamResource } from '../../../resources'
import { EventBroadcaster } from '../../eventbroadcaster'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId
  const requestDoc: TeamResource.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || !requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'teams') {
    reply(Boom.badRequest())
    return
  }

  if (teamId !== requestDoc.data.id) {
    reply(Boom.badRequest(`The id '${teamId}' does not match the document id '${requestDoc.data.id}'.`))
    return
  }

  if (requestDoc.data.attributes === undefined) {
    reply().code(204)
    return
  }

  if (requestDoc.data.attributes.motto === undefined) {
    reply().code(204)
    return
  }

  req.logger.info(`Modifying team "${teamId}" motto to "${requestDoc.data.attributes.motto}"`)

  const newMotto = requestDoc.data.attributes.motto.toString()
  const projection = {
    'teamid': true,
    'name': true,
    'motto': true,
    'members.userid': true,
    'members.name': true,
  }

  TeamModel
    .findOneAndUpdate({ teamid: requestDoc.data.id }, { motto: newMotto }, { select: projection })
    .exec()
    .then((team) => {
      reply().code(204)

      if (team.motto === newMotto) {
        return
      }

      const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
      eventBroadcaster.trigger('teams_update_motto', {
        teamid: team.teamid,
        name: team.name,
        motto: newMotto,
        members: team.members.map((member) => ({ userid: member.userid, name: member.name })),
      }, req.logger)

    }, (err) => reply(Boom.badImplementation(err)))
}
