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

function applyEmptyStatusCode(request: Request) {
  const { method, response } = request
  const { source, statusCode } = response

  // slight customisations over the Hapi default behaviour
  // see: https://github.com/hapijs/hapi/blob/b92664d9e4e1a184e7e2d958049af0f065d04f02/lib/response.js#L68

  if (source !== null) {
    return
  }

  if (statusCode === 204 ||
    (statusCode === 200 && request.route.settings.response.emptyStatusCode === 204) ||
    (method === 'options' && statusCode === 200)) {
    response.code(204)
    delete response.headers['content-type']
  }
}

const register: PluginRegister = (server, options: Options, next) => {
  const contentType = options.type
  server.ext('onPreResponse', (request: Request, reply: IReply) => {
    applyEmptyStatusCode(request)

    const response = request.response

    if (response.isBoom) {
      handleBoom(response, contentType)
    } else {
      // set content type if not already set
      if (response.statusCode !== 204 && typeof response.headers['content-type'] === 'undefined') {
        response.headers['content-type'] = contentType
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
