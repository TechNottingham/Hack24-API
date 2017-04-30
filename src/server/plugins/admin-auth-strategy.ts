import { Request } from 'hapi'
import { PluginRegister } from '../../hapi.types'

type ValidateFuncCallback = (err: any, isValid?: boolean, credentials?: any) => void

interface CustomOptions {
  username: string,
  password: string,
}

const register: PluginRegister = (server, pluginOptions: CustomOptions, next) => {
  server.auth.strategy('admin', 'basic', {
    realm: 'Admin access',
    validateFunc: (_: Request, username: string, password: string, callback: ValidateFuncCallback) => {
      if (username !== pluginOptions.username || password !== pluginOptions.password) {
        return callback(null, false)
      }
      callback(null, true, {})
    },
  })

  next()
}

register.attributes = {
  name: 'admin-auth-strategy',
  version: '0.0.0',
}

export default register
