import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { JSONApi, ChallengeResource, HackChallengesRelationship } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const hackId = req.params.hackId

  const hack = await HackModel
    .findOne({ hackid: hackId }, 'hackid challenges')
    .populate('challenges', 'challengeid name')
    .exec()

  if (hack === null) {
    reply(Boom.notFound('Hack not found'))
    return
  }

  const challenges = hack.challenges.map((challenge): JSONApi.ResourceIdentifierObject => ({
    type: 'challenges',
    id: challenge.challengeid,
  }))

  const includedChallenges = hack.challenges.map((challenge): ChallengeResource.ResourceObject => ({
    links: { self: `/challenges/${challenge.challengeid}` },
    type: 'challenges',
    id: challenge.challengeid,
    attributes: { name: challenge.name },
  }))

  const challengesResponse: HackChallengesRelationship.TopLevelDocument = {
    links: { self: `/hacks/${encodeURIComponent(hack.hackid)}/challenges` },
    data: challenges,
    included: includedChallenges,
  }

  reply(challengesResponse)
}
