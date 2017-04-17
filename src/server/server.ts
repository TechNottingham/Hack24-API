import * as Hapi from 'hapi'
import * as HapiPino from 'hapi-pino'
import {Logger} from 'pino'

import * as respond from './routes/respond'
import * as Root from './routes/root'
import * as middleware from './middleware'
import * as HapiAsyncHandler from './plugins/hapi-async-handler'
import * as BasicAuthScheme from './plugins/basic-auth-scheme'
import * as AdminAuthStrategy from './plugins/admin-auth-strategy'
import * as OverrideResponseType from './plugins/override-response-type'

import * as AttendeesRoute from './routes/attendees'
import {UsersRoute} from './routes/users'
import {TeamsRoute} from './routes/teams'
import {HacksRoute} from './routes/hacks'
import {ChallengesRoute} from './routes/challenges'
import {TeamMembersRoute} from './routes/team.members'
import {TeamEntriesRoute} from './routes/team.entries'
import {HackChallengesRoute} from './routes/hack.challenges'
import {EventBroadcaster} from './eventbroadcaster'
import Config from './config'
import connectDatabase from './database'
import { PluginRegister } from '../hapi.types'

export interface ServerInfo {
  IP: string
  Port: number
}

interface PluginRegisterDefinition {
  register: PluginRegister,
  options: any
}

export default class Server {
  private _server: Hapi.Server
  private _eventBroadcaster: EventBroadcaster
  private _plugins: Array<(PluginRegister | PluginRegisterDefinition)>
  private _routes: Array<(PluginRegister | PluginRegisterDefinition)>

  constructor(private pino: Logger) {
    this._eventBroadcaster = new EventBroadcaster(Config.pusher.url, this.pino)

    // const usersRouter = new UsersRoute(eventBroadcaster).createRouter()
    // const teamsRouter = new TeamsRoute(eventBroadcaster).createRouter()
    // const teamMembersRouter = new TeamMembersRoute(eventBroadcaster).createRouter()
    // const teamEntriesRouter = new TeamEntriesRoute(eventBroadcaster).createRouter()
    // const hacksRouter = new HacksRoute(eventBroadcaster).createRouter()
    // const hackChallengesRouter = new HackChallengesRoute(eventBroadcaster).createRouter()
    // const challengesRouter = new ChallengesRoute(eventBroadcaster).createRouter()
    // const attendeesRouter = new AttendeesRoute(eventBroadcaster).createRouter()

    this._server = new Hapi.Server()

    this._plugins = [
      {
        register: OverrideResponseType,
        options: {
          type: 'application/vnd.api+json; charset=utf-8',
        },
      },
      BasicAuthScheme,
      {
        register: AdminAuthStrategy,
        options: {
          username: Config.admin.username,
          password: Config.admin.password,
        },
      },
      HapiAsyncHandler,
      {
        register: HapiPino,
        options: {
          prettyPrint: Config.node_env === 'dev',
          instance: this.pino,
        },
      },
    ]
    this._routes = [
      { register: AttendeesRoute, options: { eventBroadcaster: this._eventBroadcaster } },
    ]

    // this._server.use(ExpressLogger)

    // this._server.use('/attendees', attendeesRouter)
    // this._server.use('/users', usersRouter)
    // this._server.use('/teams', teamMembersRouter)
    // this._server.use('/teams', teamEntriesRouter)
    // this._server.use('/teams', teamsRouter)
    // this._server.use('/hacks', hacksRouter)
    // this._server.use('/hacks', hackChallengesRouter)
    // this._server.use('/challenges', challengesRouter)

    // this._server.get('/api', (_, res) => res.send('Hack24 API is running'))

    // this._server.get('/', middleware.allowAllOriginsWithGetAndHeaders, Root.Get)
    // this._server.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
  }

  public async start() {
    await connectDatabase(Config.mongo.url, this.pino)

    const port = Config.server.port
    this._server.connection({ port })

    await this._server.register([
      ...this._plugins,
      ...this._routes,
    ])

    await this._server.start()

    return { IP: this._server.info.address, Port: this._server.info.port } as ServerInfo
  }

  public stop() {
    return this._server.stop()
  }
}
