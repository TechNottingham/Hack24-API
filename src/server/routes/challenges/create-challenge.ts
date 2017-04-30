import { Request, IReply } from 'hapi'
import * as slug from 'slug'
import { MongoDBErrors } from '../../models'
import { ChallengeModel } from '../../models'
import { ChallengeResource } from '../../../resources'
import * as Boom from '../../boom'

function slugify(name: string): string {
  return slug(name, { lower: true })
}

export default async function handler(req: Request, reply: IReply) {
  const requestDoc: ChallengeResource.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'challenges'
    || !requestDoc.data.attributes
    || !requestDoc.data.attributes.name
    || typeof requestDoc.data.attributes.name !== 'string') {
    reply(Boom.badRequest())
    return
  }

  const challenge = new ChallengeModel({
    challengeid: slugify(requestDoc.data.attributes.name),
    name: requestDoc.data.attributes.name,
    members: [],
  })

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
