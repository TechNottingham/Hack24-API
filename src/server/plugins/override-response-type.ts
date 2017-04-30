import { Request, Response, IReply, IBoom } from 'hapi'
import { PluginRegister } from '../../hapi.types'
import { JSONApi } from '../../resources'

interface Options {
  type: string
}

function handleBoom(response: Response, contentType: string) {
  const boom: IBoom = response as any
  if (typeof boom.output.headers['content-type'] === 'undefined') {
    boom.output.headers['content-type'] = contentType

    if (boom.output.payload.statusCode) {
      // manually format to jsonapi error
      const errorResponse: JSONApi.TopLevelDocument = {
        errors: [{
          status: boom.output.payload.statusCode.toString(),
          title: boom.output.payload.error,
          detail: boom.output.payload.message,
        }],
      }

      boom.output.payload = errorResponse as any
    }
  }
}

const register: PluginRegister = (server, options: Options, next) => {
  const contentType = options.type
  server.ext('onPreResponse', (request: Request, reply: IReply) => {
    const response = request.response

    if (response.isBoom) {
      handleBoom(response, contentType)
    } else {
      // set content type if not already set
      if (response.statusCode !== 204 && typeof response.headers['content-type'] === 'undefined') {
        response.headers['content-type'] = contentType
      }

      // return 204 for all preflight OPTIONS requests
      if (request.method === 'options' && response.statusCode === 200) {
        response.statusCode = 204
      }

      if (response.statusCode === 204) {
        delete response.headers['content-type']
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

export default register
