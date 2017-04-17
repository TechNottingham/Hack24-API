import * as mongoose from 'mongoose'

import {Log} from './logger'

// see: http://mongoosejs.com/docs/promises.html#plugging-in-your-own-promises-library
(mongoose as any).Promise = global.Promise

const RECONNECT_DELAY = 1000
const MAX_RECONNECT_ATTEMPTS = 5

export default function connect(url: string) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    function connect() {
      attempts ++
      mongoose.connect(url).then(() => {
        resolve()
      }, (err) => {
        err.message = `Unable to connect to MongoDB - ${err.message}`

        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          Log.warn(err.message)
          setTimeout(connect, RECONNECT_DELAY)
          return
        }

        reject(err)
      })
    }

    connect()
  })

}
