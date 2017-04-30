import * as Hapi from 'hapi'
import * as HapiPino from 'hapi-pino'
import { Logger } from 'pino'
import { WebClient } from '@slack/client'

import HapiAsyncHandler from './plugins/hapi-async-handler'
import BasicAuthScheme from './plugins/basic-auth-scheme'
import AdminAuthStrategy from './plugins/admin-auth-strategy'
import AttendeeAuthStrategy from './plugins/attendee-auth-strategy'
import OverrideResponseType from './plugins/override-response-type'

import AttendeesRoute from './routes/attendees'
import TeamsRoute from './routes/teams'
import UsersRoute from './routes/users'
import RootRoute from './routes/root'
import ChallengesRoute from './routes/challenges'

import EventBroadcaster from './eventbroadcaster'
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
  private server: Hapi.Server
  private eventBroadcaster: EventBroadcaster
  private plugins: Array<(PluginRegister | PluginRegisterDefinition)>
  private routes: any[]
  private slack: WebClient

  constructor(private pino: Logger) {
    this.eventBroadcaster = new EventBroadcaster(Config.pusher.url, this.pino)

    // const usersRouter = new UsersRoute(eventBroadcaster).createRouter()
    // const teamsRouter = new TeamsRoute(eventBroadcaster).createRouter()
    // const teamMembersRouter = new TeamMembersRoute(eventBroadcaster).createRouter()
    // const teamEntriesRouter = new TeamEntriesRoute(eventBroadcaster).createRouter()
    // const hacksRouter = new HacksRoute(eventBroadcaster).createRouter()
    // const hackChallengesRouter = new HackChallengesRoute(eventBroadcaster).createRouter()
    // const challengesRouter = new ChallengesRoute(eventBroadcaster).createRouter()
    // const attendeesRouter = new AttendeesRoute(eventBroadcaster).createRouter()

    this.slack = new WebClient(Config.slack.token, Config.slack.apiUrl ? {
      slackAPIUrl: Config.slack.apiUrl,
    } : undefined)

    this.server = new Hapi.Server()
    this.server.app.eventBroadcaster = this.eventBroadcaster

    this.plugins = [
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
      {
        register: AttendeeAuthStrategy,
        options: {
          slack: this.slack,
          password: Config.hackbot.password,
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
    this.routes = [
      AttendeesRoute,
      TeamsRoute,
      UsersRoute,
      RootRoute,
      ChallengesRoute,
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
    this.server.connection({ port })

    await this.server.register([
      ...this.plugins,
      ...this.routes,
    ])

    await this.server.start()

    return { IP: this.server.info.address, Port: this.server.info.port } as ServerInfo
  }

  public stop() {
    return this.server.stop()
  }
}
