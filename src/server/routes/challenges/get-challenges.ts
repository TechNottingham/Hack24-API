import { Request, IReply } from 'hapi'
import { ChallengeModel } from '../../models'
import { ChallengeResource, ChallengesResource } from '../../../resources'

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export default async function handler(req: Request, reply: IReply) {
  const query: any = {}

  if (req.query['filter[name]']) {
    query.name = new RegExp(escapeForRegex(req.query['filter[name]']), 'i')
  }

  const challenges = await ChallengeModel
    .find(query, 'challengeid name')
    .sort({ challengeid: 1 })
    .exec()

  const challengeResponses = challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
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
