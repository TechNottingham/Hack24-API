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
      },
    }, {
      method: 'DELETE',
      path: '/challenges/{challengeId}',
      handler: {
        async: deleteChallenge,
      },
      config: {
        auth: 'admin',
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
