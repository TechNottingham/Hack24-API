import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId

  const team = await TeamModel.findOne({ teamid: teamId }).exec()

  if (team.members.length > 0) {
    reply(Boom.badRequest('Only empty teams can be deleted'))
    return
  }

  await TeamModel.remove({ teamid: teamId }).exec()

  reply().code(204)
}
