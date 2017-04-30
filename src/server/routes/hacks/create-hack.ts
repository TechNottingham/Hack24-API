import { Request, IReply } from 'hapi'
import * as slug from 'slug'
import { MongoDBErrors } from '../../models'
import { HackModel } from '../../models'
import { HackResource } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from '../../boom'

function slugify(name: string): string {
  return slug(name, { lower: true })
}

export default async function handler(req: Request, reply: IReply) {
  const requestDoc: HackResource.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'hacks'
    || !requestDoc.data.attributes
    || !requestDoc.data.attributes.name
    || typeof requestDoc.data.attributes.name !== 'string') {
    reply(Boom.badRequest())
    return
  }

  const hack = new HackModel({
    hackid: slugify(requestDoc.data.attributes.name),
    name: requestDoc.data.attributes.name,
    members: [],
  })

  try {
    await hack.save()
  } catch (err) {
    if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
      reply(Boom.conflict('Hack already exists'))
      return
    }
    throw err
  }

  const hackResponse: HackResource.TopLevelDocument = {
    links: {
      self: `/hacks/${encodeURIComponent(hack.hackid)}`,
    },
    data: {
      type: 'hacks',
      id: hack.hackid,
      attributes: {
        name: hack.name,
      },
    },
  }

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  eventBroadcaster.trigger('hacks_add', {
    hackid: hack.hackid,
    name: hack.name,
  }, req.logger)

  reply(hackResponse).code(201)
}
