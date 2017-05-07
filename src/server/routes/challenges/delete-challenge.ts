import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const challengeId = req.params.challengeId

  if (challengeId === undefined || typeof challengeId !== 'string' || challengeId.length === 0) {
    reply(Boom.badRequest())
    return
  }

  const deletedChallenge = await ChallengeModel
    .findOneAndRemove({ challengeid: challengeId }, { select: { _id: true } })
    .exec()

  if (deletedChallenge === null) {
    reply(Boom.notFound('Challenge not found'))
    return
  }

  reply().code(204)
}
