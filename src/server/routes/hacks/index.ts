import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import createHack from './create-hack'
import deleteHack from './delete-hack'
import getHack from './get-hack'
import getHacks from './get-hacks'

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/hacks',
      handler: {
        async: createHack,
      },
      config: {
        auth: 'attendee',
        validate: {
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('hacks'),
              attributes: Joi.object().keys({
                name: Joi.string(),
              }),
            }),
          }),
        },
      },
    }, {
      method: 'DELETE',
      path: '/hacks/{hackId}',
      handler: {
        async: deleteHack,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            hackId: Joi.string(),
          },
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'GET',
      path: '/hacks',
      handler: {
        async: getHacks,
      },
      config: {
        cors: true,
      },
    }, {
      method: 'GET',
      path: '/hacks/{hackId}',
      handler: {
        async: getHack,
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
  name: 'hacks-routes',
  version: '0.0.0',
}

export default register
