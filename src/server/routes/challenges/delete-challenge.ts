import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const challengeId = req.params.challengeId

  if (challengeId === undefined || typeof challengeId !== 'string' || challengeId.length === 0) {
    reply(Boom.badRequest())
    return
  }

  const challenge = await ChallengeModel.findOne({ challengeid: challengeId }).exec()
  if (challenge === null) {
    reply(Boom.notFound('Challenge not found'))
    return
  }

  await ChallengeModel.remove({ _id: challenge._id }).exec()
  reply().code(204)
}
