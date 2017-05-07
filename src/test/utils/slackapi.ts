import * as express from 'express'
import { Server } from 'http'

export class SlackApi {
  public static Create(port: number, basePath: string) {
    return new SlackApi(basePath).listen(port)
  }

  private _server: Server
  private _usersInfo: any

  constructor(private basePath: string) { }

  public set UsersList(response: any) {
    this._usersInfo = response
  }

  public listen(port: number) {
    return new Promise<SlackApi>((resolve) => {
      this._server = express()
        .post(`${this.basePath}/users.info`, (_, res) => {
          res.status(200).send(this._usersInfo)
        })
        .listen(port, () => resolve(this))
    })
  }

  public close() {
    return new Promise((resolve) => {
      this._server.close(resolve)
    })
  }
}
