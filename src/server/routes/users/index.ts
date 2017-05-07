import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import createUser from './create-user'
import getUser from './get-user'
import getUsers from './get-users'

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/users',
      handler: {
        async: createUser,
      },
      config: {
        auth: 'attendee',
        validate: {
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('users'),
              attributes: Joi.object().keys({
                name: Joi.string(),
              }),
            }),
          }),
        },
      },
    },
    {
      method: 'GET',
      path: '/users',
      handler: {
        async: getUsers,
      },
      config: {
        cors: true,
      },
    },
    {
      method: 'GET',
      path: '/users/{userId}',
      handler: {
        async: getUser,
      },
      config: {
        cors: true,
        validate: {
          params: {
            userId: Joi.string(),
          },
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'users-routes',
  version: '0.0.0',
}

export default register
