import { Request, IReply } from 'hapi'
import { Logger } from 'pino'

declare module 'hapi' {
  interface IRouteHandlerConfig {
    async?: (request: Request, reply: IReply) => Promise<void>
  }
  interface IReply {
    (): Response
  }
  interface Request {
    logger: Logger
  }
}
