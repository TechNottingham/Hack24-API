declare module "pusher" {

  namespace pusher {
    interface PusherStatic {
      forURL(url: string): PusherClient;
    }
    interface PusherClient {
      trigger(channel: string, event: string, data: any, socketId: string, callback: (err: Error) => void): void;
      trigger(channels: string[], event: string, data: any, socketId: string, callback: (err: Error) => void): void;
    }
    interface Config {
      appId: string;
      key: string;
      secret: string;
      encrypted?: boolean;
      host?: string;
      port?: number;
      cluster?: string;
    }
  }

  var pusher: pusher.PusherStatic;

  export = pusher;
}
