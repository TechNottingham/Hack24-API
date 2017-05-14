import { Request, IReply } from 'hapi'
import { MongoDBErrors } from '../../models'
import { Challenge, ChallengeModel } from '../../models'
import { ChallengeResource } from '../../../resources'
import * as Boom from 'boom'
import { slugify } from '../../utils'

export default async function handler(req: Request, reply: IReply) {
  const requestDoc: ChallengeResource.TopLevelDocument = req.payload

  const challenge = new ChallengeModel({
    challengeid: slugify(requestDoc.data.attributes.name),
    name: requestDoc.data.attributes.name,
    members: [],
  } as Challenge)

  try {
    await challenge.save()
  } catch (err) {
    if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
      reply(Boom.conflict('Challenge already exists'))
      return
    }
    throw err
  }

  const challengeResponse: ChallengeResource.TopLevelDocument = {
    links: {
      self: `/challenges/${encodeURIComponent(challenge.challengeid)}`,
    },
    data: {
      type: 'challenges',
      id: challenge.challengeid,
      attributes: {
        name: challenge.name,
      },
    },
  }

  reply(challengeResponse).code(201)
}
