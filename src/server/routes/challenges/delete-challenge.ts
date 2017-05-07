import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { challengeId: challengeid } = req.params

  const deletedChallenge = await ChallengeModel
    .findOneAndRemove({ challengeid }, { select: { _id: true } })
    .exec()

  if (deletedChallenge === null) {
    reply(Boom.notFound('Challenge not found'))
    return
  }

  reply().code(204)
}
