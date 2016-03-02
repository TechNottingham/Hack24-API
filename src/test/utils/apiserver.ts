"use strict";

import {fork, ChildProcess} from 'child_process';

export class ApiServer {
  private static _api: ChildProcess;
  private static _port: number = 12123;
  private static _hackbotUsername: string = 'username123456789';
  private static _hackbotPassword: string = 'password123456789';
  private static _adminUsername: string = 'admin_user123456789';
  private static _adminPassword: string = 'admin_pass123456789';
  
  public static get Port(): number {
    return this._port;
  }
  
  public static get HackbotUsername(): string {
    return this._hackbotUsername;
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
  
  static start() {
    
    return new Promise<void>((resolve, reject) => {
      
      this._api = fork('../bin/server.js', [], {
        cwd: process.cwd(),
        env: {
          PORT: this._port,
          HACKBOT_USERNAME: this._hackbotUsername,
          HACKBOT_PASSWORD: this._hackbotPassword,
          ADMIN_USERNAME: this._adminUsername,
          ADMIN_PASSWORD: this._adminPassword
        },
        silent: true
      });
      
      this._api.stderr.on('data', (data: Buffer) => {
        console.log(`!> ${data.toString('utf8')}`);
      });
      
      let waitingForResolve = true;
      
      this._api.stdout.on('data', (data: Buffer) => {
        const dataStr = data.toString('utf8');
        console.log(`>> ${dataStr}`);
        if (waitingForResolve && dataStr.startsWith('Server started on port')) {
          waitingForResolve = false;
          resolve();
        }
      });
    
      this._api.on('close', function (code) {
        if (code !== null && code !== 0) return console.error(new Error('API closed with non-zero exit code (' + code + ')'));
      });
    
      this._api.on('error', (err) => {
        reject(new Error('Unable to start API: ' + err.message))
      });
      
    });
  }
  
  static stop(): void {
    if (!this._api) return;
    this._api.kill('SIGINT');
  }
}