import { PluginRegister } from '../../../hapi.types'
import addHackChallenges from './add-hack-challenges'
import deleteHackChallenges from './delete-hack-challenges'
import getHackChallenges from './get-hack-challenges'

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
      },
    }, {
      method: 'DELETE',
      path: '/hacks/{hackId}/challenges',
      handler: {
        async: deleteHackChallenges,
      },
      config: {
        auth: 'attendee',
      },
    }, {
      method: 'GET',
      path: '/hacks/{hackId}/challenges',
      handler: {
        async: getHackChallenges,
      },
      config: {
        cors: true,
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
