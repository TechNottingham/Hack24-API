import { Request, IReply } from 'hapi'
import * as Boom from 'boom'
import { TeamModel } from '../../models'
import { TeamResource } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'

export default async function handler(req: Request, reply: IReply) {
  const { teamId: teamid } = req.params
  const requestDoc: TeamResource.TopLevelDocument = req.payload

  if (teamid !== requestDoc.data.id) {
    reply(Boom.badRequest(`The id '${teamid}' does not match the document id '${requestDoc.data.id}'.`))
    return
  }

  if (requestDoc.data.attributes === undefined) {
    reply()
    return
  }

  if (requestDoc.data.attributes.motto === undefined) {
    reply()
    return
  }

  req.logger.info(`Modifying team "${teamid}" motto to "${requestDoc.data.attributes.motto}"`)

  const newMotto = requestDoc.data.attributes.motto.toString()
  const projection = {
    'teamid': true,
    'name': true,
    'motto': true,
    'members.userid': true,
    'members.name': true,
  }

  const team = await TeamModel
    .findOneAndUpdate({ teamid }, { motto: newMotto }, { select: projection })
    .exec()

  reply()

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
}
