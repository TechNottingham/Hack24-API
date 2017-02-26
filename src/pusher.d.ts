declare module "pusher" {
  
  namespace pusher {
    interface PusherStatic {
      forURL(url: string): Pusher;
    }
    interface Pusher {
      trigger(channel: string, event: string, data: any, socketId: string, callback: Function): void;
      trigger(channels: string[], event: string, data: any, socketId: string, callback: Function): void;
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
