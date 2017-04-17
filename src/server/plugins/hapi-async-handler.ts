import { PluginRegister } from '../../hapi.types'
import * as assert from 'assert'

const register: PluginRegister = (server, _, next) => {
  server.bind(this)
  server.handler('async', (__, options: () => Promise<void>) => {
    const asyncHandler = options
    assert.equal('function', typeof asyncHandler, 'The async route handler must be a function')

    return (request, reply) => {
      const promise: Promise<void> = asyncHandler.call(this, request, reply)
      promise.catch((error) => {
        if (error instanceof Error) {
          const { name, message, stack } = error
          request.log(['error', 'uncaught'], { name, message, stack })
        } else {
          request.log(['error', 'uncaught'], { name: 'Error', message: error })
          error = new Error(error)
        }
        reply(error)
      })
    }
  })
  next()
}

register.attributes = {
  name: 'hapi-async-handler',
  version: '0.0.0',
}

export = register
