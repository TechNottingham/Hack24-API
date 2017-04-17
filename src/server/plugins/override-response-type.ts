import { Request, IReply, IBoom } from 'hapi'
import { PluginRegister } from '../../hapi.types'

interface Options {
  type: string
}

const register: PluginRegister = (server, options: Options, next) => {
  const type = options.type
  server.ext('onPreResponse', (request: Request, reply: IReply) => {
    const response = request.response
    if (response.isBoom) {
      const boom: IBoom = response as any
      if (typeof boom.output.headers['content-type'] === 'undefined') {
        boom.output.headers['content-type'] = type
      }
    } else {
      if (response.statusCode !== 204 && typeof response.headers['content-type'] === 'undefined') {
        response.headers['content-type'] = type
      }
    }
    reply.continue()
  })

  next()
}

register.attributes = {
  name: 'override-response-type',
  version: '0.0.0',
}

export = register
