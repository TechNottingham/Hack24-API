import { Server, IServerMethod } from 'hapi'

export interface PluginRegister {
  (server: Server, options: any, next: IServerMethod): void
  attributes?: any
}
