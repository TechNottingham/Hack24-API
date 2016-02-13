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
  
  static async start() {
    let db: Db;
    
    try {
      db = await this.connectMongo();
    } catch (err) {
      await this.spawnMongoDB();
      db = await this.connectMongo();
    }
    
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
  
  private static async spawnMongoDB() {
    this._spawn = this.spawn();
  }
  
  private static async connectMongo() {
    return await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
  }
  
  private static spawn() {
    console.log('Starting MongoDB server...');
      
    let mongod = spawn('mongod');
    
    if (process.env.DEBUG) {
      mongod.stdout.setEncoding('utf8');
      mongod.stderr.setEncoding('utf8');
    
      mongod.stdout.on('data', console.log);
      mongod.stderr.on('data', console.error);
    }
  
    mongod.on('close', function (code) {
      if (code !== null && code !== 0) return console.error(new Error('MongoDB finished with non-zero exit code (' + code + ')'));
      console.log('MongoDB closed.');
    });
  
    mongod.on('error', (err) => {
      throw new Error('Unable to start MongoDB: ' + err.message);
    });
    
    return mongod;
  } 
  
  static stop(): Promise<void> {
    if (!this._db) return Promise.resolve();
    
    return this._db.close().then(() => {
      if (this._spawn) {
        console.log('Stopping MongoDB server...');
        this._spawn.kill('SIGINT');
      }
    });
  }
}