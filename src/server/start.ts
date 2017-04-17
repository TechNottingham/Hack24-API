import {Log} from './logger'
import Server from './server'

function warnEnvironment(vars: string[]) {
  const missing = vars.filter((val) => process.env[val] === undefined)
  missing.forEach((name) => Log.warn(`Environment variable ${name} is not set`))
}

warnEnvironment([
  'HACKBOT_PASSWORD',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'PUSHER_URL',
  'SLACK_API_TOKEN',
])

const server = new Server()
server.listen().then((info) => {
  Log.info(`Server started on port ${info.Port}`)
  if (process.send !== undefined) {
    process.send('started')
  }
}).catch((err) => {
  Log.error('Server could not be started')
  Log.error(err)
  process.exit(1)
})
