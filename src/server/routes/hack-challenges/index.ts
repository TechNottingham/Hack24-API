import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import addHackChallenges from './add-hack-challenges'
import deleteHackChallenges from './delete-hack-challenges'
import getHackChallenges from './get-hack-challenges'

const multipleChallengesSchema = Joi.object().keys({
  data: Joi.array().items(
    Joi.object().keys({
      id: Joi.string(),
      type: Joi.only('challenges'),
    }),
  ),
})

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/hacks/{hackId}/challenges',
      handler: {
        async: addHackChallenges,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            hackId: Joi.string(),
          },
          payload: multipleChallengesSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'DELETE',
      path: '/hacks/{hackId}/challenges',
      handler: {
        async: deleteHackChallenges,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            hackId: Joi.string(),
          },
          payload: multipleChallengesSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'GET',
      path: '/hacks/{hackId}/challenges',
      handler: {
        async: getHackChallenges,
      },
      config: {
        cors: true,
        validate: {
          params: {
            hackId: Joi.string(),
          },
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'hack-challenges-routes',
  version: '0.0.0',
}

export default register
