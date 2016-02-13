"use strict";

import {fork, ChildProcess} from 'child_process';

export class ApiServer {
  private static _api: ChildProcess;
  private static _port: number = 12123;
  private static _hackbotUsername: string = 'username123456789';
  private static _hackbotPassword: string = 'password123456789';
  
  public static get Port(): number {
    return this._port;
  }
  
  public static get HackbotUsername(): string {
    return this._hackbotUsername;
  }
  
  public static get HackbotPassword(): string {
    return this._hackbotPassword;
  }
  
  static start() {
    
    console.log('Starting API server...');
    
    return new Promise<void>((resolve, reject) => {
      
      this._api = fork('../bin/server.js', [], {
        cwd: process.cwd(),
        env: {
          PORT: this._port,
          HACKBOT_USERNAME: this._hackbotUsername,
          HACKBOT_PASSWORD: this._hackbotPassword
        },
        silent: true
      });
      
      this._api.stdout.on('data', (data: Buffer) => {
        const dataStr = data.toString('utf8');
        if (dataStr.startsWith('Server started on port')) {
          this._api.stdout.removeAllListeners();
          resolve();
        }
      });
    
      this._api.on('close', function (code) {
        if (code !== null && code !== 0) return console.error(new Error('API closed with non-zero exit code (' + code + ')'));
        console.log('API closed.');
      });
    
      this._api.on('error', (err) => {
        reject(new Error('Unable to start API: ' + err.message))
      });
      
    });
  }
  
  static stop(): void {
    if (!this._api) return;
    console.log('Stopping API server...');
    this._api.kill('SIGINT');
  }
}