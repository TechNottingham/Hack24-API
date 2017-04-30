import { Server, Request, IReply, IServerAuthScheme } from 'hapi'
import { PluginRegister } from '../../hapi.types'
import * as Boom from '../boom'

type ValidateFuncCallback = (err: any, isValid?: boolean, credentials?: any) => void

interface PluginSettings {
  realm?: string,
  allowEmptyUsername?: boolean,
  validateFunc: (request: Request, username: string, password: string, callback: ValidateFuncCallback) => void
}

function scheme(_: Server, settings: PluginSettings): IServerAuthScheme {
  const realm = settings.realm
  const allowEmptyUsername = settings.allowEmptyUsername
  const validateFunc = settings.validateFunc

  return {
    authenticate: (request: Request, reply: IReply) => {
      const req = request.raw.req
      const authorization = req.headers.authorization
      if (!authorization) {
        return reply(Boom.unauthorized('Credentials required', 'Basic', { realm }))
      }

      const parts = authorization.split(/\s+/)

      if (parts[0].toLowerCase() !== 'basic') {
        return reply(Boom.unauthorized('Credentials required', 'Basic', { realm }))
      }

      if (parts.length !== 2) {
        return reply(Boom.badRequest('Bad HTTP authentication header format'))
      }

      const credentialsPart = Buffer.from(parts[1], 'base64').toString()
      const sep = credentialsPart.indexOf(':')
      if (sep === -1) {
        return reply(Boom.badRequest('Bad header internal syntax'))
      }

      const username = credentialsPart.slice(0, sep)

      if (!username && !allowEmptyUsername) {
        return reply(Boom.unauthorized('HTTP authentication header missing username', 'Basic', { realm }))
      }

      const password = credentialsPart.slice(sep + 1)

      validateFunc(request, username, password, (err, isValid, credentials) => {
        credentials = credentials || null

        if (err) {
          return reply(err, null, { credentials: credentials })
        }

        if (!isValid) {
          return reply(Boom.unauthorized('Bad username or password', 'Basic', { realm }))
        }

        if (!credentials || typeof credentials !== 'object') {
          return reply(Boom.badImplementation('Bad credentials object received for Basic auth validation'))
        }

        return reply.continue({ credentials: credentials })
      })
    },
  }
}

const register: PluginRegister = (plugin, _, next) => {
  plugin.auth.scheme('basic', scheme)
  next()
}

register.attributes = {
  name: 'basic-auth-scheme',
  version: '0.0.0',
}

export default register
