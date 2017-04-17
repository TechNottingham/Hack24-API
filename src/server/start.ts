import * as Pino from 'pino'
import Server from './server'
import Config from './config'

const pino = Pino({
  prettyPrint: ['dev', 'test'].indexOf(Config.node_env) > -1,
})

function warnEnvironment(vars: string[]) {
  const missing = vars.filter((val) => process.env[val] === undefined)
  missing.forEach((name) => pino.warn(`Environment variable ${name} is not set`))
}

warnEnvironment([
  'HACKBOT_PASSWORD',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'PUSHER_URL',
  'SLACK_API_TOKEN',
])

const server = new Server(pino)
server.start().then((info) => {
  pino.info(`Server started on port ${info.Port}`)
  if (process.send !== undefined) {
    process.send('started')
  }
}).catch((err) => {
  pino.error('Server could not be started')
  pino.error(err)
  process.exit(1)
})
