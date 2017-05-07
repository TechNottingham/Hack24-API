import { Request, IReply } from 'hapi'
import { UserModel } from '../../models'
import { MongoDBErrors } from '../../models'
import { UserResource } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const requestDoc: UserResource.TopLevelDocument = req.payload

  const user = new UserModel({
    userid: requestDoc.data.id,
    name: requestDoc.data.attributes.name,
  })

  try {
    await user.save()
  } catch (err) {
    if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
      reply(Boom.conflict('User already exists'))
      return
    }
    throw err
  }

  const userResponse: UserResource.TopLevelDocument = {
    links: {
      self: `/users/${encodeURIComponent(user.userid)}`,
    },
    data: {
      type: 'users',
      id: user.userid,
      attributes: {
        name: user.name,
      },
      relationships: {
        team: {
          links: {
            self: `/users/${encodeURIComponent(user.userid)}/team`,
          },
          data: null,
        },
      },
    },
  }

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  eventBroadcaster.trigger('users_add', {
    userid: user.userid,
    name: user.name,
  }, req.logger)

  reply(userResponse).code(201)
}
