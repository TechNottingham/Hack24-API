import { Request, IReply } from 'hapi'
import { HackModel, TeamModel } from '../../models'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { hackId: hackid } = req.params

  const hack = await HackModel.findOne({ hackid }, '_id').exec()
  if (hack === null) {
    reply(Boom.notFound('Hack not found'))
    return
  }

  const teams = await TeamModel.findOne({ entries: hack._id }, '_id').exec()
  if (teams !== null) {
    reply(Boom.badRequest('Hack is entered into a team'))
    return
  }

  await HackModel.remove({ _id: hack._id }).exec()
  reply()
}
