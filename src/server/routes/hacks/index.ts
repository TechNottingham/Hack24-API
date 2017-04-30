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
      },
    }, {
      method: 'DELETE',
      path: '/hacks/{hackId}',
      handler: {
        async: deleteHack,
      },
      config: {
        auth: 'attendee',
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
