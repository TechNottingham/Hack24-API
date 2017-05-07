import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import createChallenge from './create-challenge'
import deleteChallenge from './delete-challenge'
import getChallenge from './get-challenge'
import getChallenges from './get-challenges'

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/challenges',
      handler: {
        async: createChallenge,
      },
      config: {
        auth: 'admin',
        validate: {
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('challenges'),
              attributes: Joi.object().keys({
                name: Joi.string(),
              }),
            }),
          }),
        },
      },
    }, {
      method: 'DELETE',
      path: '/challenges/{challengeId}',
      handler: {
        async: deleteChallenge,
      },
      config: {
        auth: 'admin',
        validate: {
          params: {
            challengeId: Joi.string(),
          },
        },
      },
    }, {
      method: 'GET',
      path: '/challenges',
      handler: {
        async: getChallenges,
      },
      config: {
        cors: true,
      },
    }, {
      method: 'GET',
      path: '/challenges/{challengeId}',
      handler: {
        async: getChallenge,
      },
      config: {
        cors: true,
        validate: {
          params: {
            challengeId: Joi.string(),
          },
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'challenges-routes',
  version: '0.0.0',
}

export default register
