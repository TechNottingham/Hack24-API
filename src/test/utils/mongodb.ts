"use strict";

import {spawn, ChildProcess} from 'child_process';
import {MongoClient, Db} from 'mongodb';
import {Users} from '../models/users'
import {Teams} from '../models/teams'

export class MongoDB {
  private static _spawn: ChildProcess;
  private static _db: Db;
  private static _users: Users;
  private static _teams: Teams;
  
  static get Db(): Db {
    return this._db;
  }
  
  static get Users(): Users {
    return this._users;
  }
  
  static get Teams(): Teams {
    return this._teams;
  }
  
  static async ensureRunning() {
    const db = await this.connectMongo();
    await this.prepareDb(db);
  }
  
  private static prepareDb(db: Db): Promise<void> {
    return new Promise<void>((resolve) => {    
      this._db = db;
      Users.Create(db).then((users) => {
        this._users = users;
        Teams.Create(db).then((teams) => {
          this._teams = teams;
          resolve();
        });
      });
    })
  }
  
  private static async connectMongo() {
    return await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
  }
}