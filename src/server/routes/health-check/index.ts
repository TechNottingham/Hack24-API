
import { PluginRegister } from '../../../hapi.types'

const register: PluginRegister = (server, _, next) => {

  server.route({
    method: 'GET',
    path: '/api',
    handler: (__, reply) => reply('Hack24 API is running').type('text/plain'),
    config: {
      cors: true,
    },
  })

  next()
}

register.attributes = {
  name: 'health-check-routes',
  version: '0.0.0',
}

export default register
