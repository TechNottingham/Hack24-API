import { PluginRegister } from '../../../hapi.types'
import { Root } from '../../../resources'

const register: PluginRegister = (server, _, next) => {

  server.route({
    method: 'GET',
    path: '/',
    handler: (__, reply) => {
      const rootResponse: Root.TopLevelDocument = {
        jsonapi: {
          version: '1.0',
        },
        links: {
          self: '/',
          teams: {
            href: '/teams',
          },
          users: {
            href: '/users',
          },
          attendees: {
            href: '/attendees',
          },
          hacks: {
            href: '/hacks',
          },
          challenges: {
            href: '/challenges',
          },
        },
      }
      reply(rootResponse)
    },
    config: {
      cors: true,
    },
  })

  next()
}

register.attributes = {
  name: 'root-routes',
  version: '0.0.0',
}

export default register
