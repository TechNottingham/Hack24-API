import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import { ChallengeResource, ChallengesResource } from '../../../resources'
import { createEscapedRegex } from '../../utils'

export default async function handler(req: Request, reply: IReply) {
  const query: { name?: RegExp } = {}

  if (req.query['filter[name]']) {
    query.name = createEscapedRegex(req.query['filter[name]'])
  }

  const challenges = await ChallengeModel
    .find(query, 'challengeid name')
    .sort({ challengeid: 1 })
    .exec()

  const challengeResponses = challenges.map((challenge): ChallengeResource.ResourceObject => ({
    links: { self: `/challenges/${encodeURIComponent(challenge.challengeid)}` },
    type: 'challenges',
    id: challenge.challengeid,
    attributes: {
      name: challenge.name,
    },
  }))

  const challengesResponse: ChallengesResource.TopLevelDocument = {
    links: { self: `/challenges` },
    data: challengeResponses,
  }

  reply(challengesResponse)
}
