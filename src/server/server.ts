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
import HacksRoute from './routes/hacks'
import HackChallengesRoute from './routes/hack-challenges'
import TeamMembersRoute from './routes/team-members'
import TeamEntriesRoute from './routes/team-entries'

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
  private routes: Array<(PluginRegister | PluginRegisterDefinition)>
  private slack: WebClient

  constructor(private pino: Logger) {
    this.eventBroadcaster = new EventBroadcaster(Config.pusher.url, this.pino)

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
      RootRoute,
      AttendeesRoute,
      UsersRoute,
      TeamsRoute,
      TeamMembersRoute,
      TeamEntriesRoute,
      ChallengesRoute,
      HacksRoute,
      HackChallengesRoute,
    ]
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
