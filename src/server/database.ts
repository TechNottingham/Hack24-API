import * as mongoose from 'mongoose'

import {Log} from './logger'

(<any> mongoose).Promise = global.Promise

export default function connect(url: string) {
  return new Promise((resolve, reject) => {
    let attempts = 0

    function connect() {
      attempts ++
      mongoose.connect(url).then(() => {
        resolve()
      }, (err) => {
        err.message = `Unable to connect to MongoDB - ${err.message}`

        if (attempts < 5) {
          Log.warn(err.message)
          setTimeout(connect, 1000)
          return
        }

        reject(err)
      })
    }

    connect()
  })

}
