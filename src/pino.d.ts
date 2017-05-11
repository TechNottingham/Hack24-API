declare module 'pino' {

  function pino(options?: pino.Options): pino.Logger

  module pino {
    interface Options {
      prettyPrint?: boolean
      level?: string
    }

    interface Logger {
      warn(message: string, data?: any): void
      info(message: string, data?: any): void
      error(message: string, data?: any): void
    }
  }

  export = pino
}
