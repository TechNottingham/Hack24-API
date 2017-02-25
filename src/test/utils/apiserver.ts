import {fork, ChildProcess} from 'child_process';

export class ApiServer {

  public static start() {

    return new Promise<void>((resolve, reject) => {

      let env: any = {
        PORT: this._port,
        HACKBOT_PASSWORD: this._hackbotPassword,
        ADMIN_USERNAME: this._adminUsername,
        ADMIN_PASSWORD: this._adminPassword,
        PUSHER_URL: `http://${this._pusherKey}:${this._pusherSecret}@${this._pusherHost}:${this._pusherPort}/apps/${this._pusherAppId}`,
      };

      if ('MONGODB_URL' in process.env) {
        env.MONGODB_URL = process.env.MONGODB_URL;
      }

      this._api = fork('bin/server.js', [], {
        cwd: process.cwd(),
        env: env,
        silent: true,
      });

      this._api.once('message', () => {
        resolve();
      });

      this._api.stderr.on('data', (data: Buffer) => {
        console.log(`!> ${data.toString('utf8')}`); // tslint:disable-line:no-console
      });

      this._api.stdout.on('data', (data: Buffer) => {
        console.log(`#> ${data.toString('utf8')}`); // tslint:disable-line:no-console
      });

      this._api.once('close', (code) => {
        if (code !== null && code !== 0) {
          return console.error(new Error('API closed with non-zero exit code (' + code + ')'));
        }
      });

      this._api.on('error', (err) => {
        reject(new Error('Unable to start API: ' + err.message));
      });

    });
  }

  public static stop(): void {
    if (!this._api) {
      return;
    }
    this._api.kill('SIGINT');
  }

  private static _api: ChildProcess;
  private static _port: number = 12123;
  private static _pusherHost: string = 'localhost';
  private static _pusherPort: number = 12124;
  private static _pusherAppId: string = '187312';
  private static _pusherKey: string = 'my-pusher-key';
  private static _pusherSecret: string = 'my-suuuuuper-secret';
  private static _hackbotPassword: string = 'password123456789';
  private static _adminUsername: string = 'admin_user123456789';
  private static _adminPassword: string = 'admin_pass123456789';

  public static get Port(): number {
    return this._port;
  }

  public static get PusherHost(): string {
    return this._pusherHost;
  }

  public static get PusherKey(): string {
    return this._pusherKey;
  }

  public static get PusherSecret(): string {
    return this._pusherSecret;
  }

  public static get PusherPort(): number {
    return this._pusherPort;
  }

  public static get PusherAppId(): string {
    return this._pusherAppId;
  }

  public static get HackbotPassword(): string {
    return this._hackbotPassword;
  }

  public static get AdminUsername(): string {
    return this._adminUsername;
  }

  public static get AdminPassword(): string {
    return this._adminPassword;
  }
}
