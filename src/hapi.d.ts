import { Request, IReply } from 'hapi'

declare module 'hapi' {
  interface IRouteHandlerConfig {
    async?: (request: Request, reply: IReply) => Promise<void>
  }
  interface IReply {
    (): Response
  }
}
