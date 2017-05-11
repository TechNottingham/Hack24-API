import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import { ChallengeResource } from '../../../resources'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { challengeId: challengeid } = req.params

  const challenge = await ChallengeModel
    .findOne({ challengeid }, 'challengeid name')
    .exec()

  if (challenge === null) {
    reply(Boom.notFound('Challenge not found'))
    return
  }

  const challengeResponse: ChallengeResource.TopLevelDocument = {
    links: { self: `/challenges/${encodeURIComponent(challenge.challengeid)}` },
    data: {
      type: 'challenges',
      id: challenge.challengeid,
      attributes: {
        name: challenge.name,
      },
    },
  }

  reply(challengeResponse)
}
