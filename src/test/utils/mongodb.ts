import {MongoClient, Db} from 'mongodb';
import {Users} from '../models/users';
import {Teams} from '../models/teams';
import {Hacks} from '../models/hacks';
import {Challenges} from '../models/challenges';
import {Attendees} from '../models/attendees';

export class MongoDB {

  public static async ensureRunning() {
    let db: Db;
    try {
      db = await this.connectMongo();
    } catch (err) {
      throw new Error(`Unable to connect to MongoDB - ${err.message}`);
    }
    await this.prepareDb(db);
  }

  private static _db: Db;
  private static _users: Users;
  private static _teams: Teams;
  private static _hacks: Hacks;
  private static _challenges: Challenges;
  private static _attendees: Attendees;

  static get Db(): Db {
    return this._db;
  }

  static get Users(): Users {
    return this._users;
  }

  static get Teams(): Teams {
    return this._teams;
  }

  static get Hacks(): Hacks {
    return this._hacks;
  }

  static get Challenges(): Challenges {
    return this._challenges;
  }

  static get Attendees(): Attendees {
    return this._attendees;
  }

  private static prepareDb(db: Db): Promise<void> {
    return new Promise<void>((resolve) => {
      this._db = db;
      const promises = [Users.Create(db), Teams.Create(db), Hacks.Create(db), Challenges.Create(db), Attendees.Create(db)];
      Promise.all<Users | Teams | Hacks | Challenges | Attendees>(promises)
        .then((results: [Users, Teams, Hacks, Challenges, Attendees]) => {
          this._users = results[0];
          this._teams = results[1];
          this._hacks = results[2];
          this._challenges = results[3];
          this._attendees = results[4];
          resolve();
        });
    });
  }

  private static async connectMongo() {
    return await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
  }
}
