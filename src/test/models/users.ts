"use strict";

import {Db, Collection, ObjectID} from 'mongodb';
import {Random} from '../utils/random';

export interface IUser {
  _id?: ObjectID;
  userid: string;
  name: string;
  modified: Date;
}

export class Users {
  private _collection: Collection;
  
  public static Create(db: Db): Promise<Users> {
    return new Promise<Users>((resolve, reject) => {
      var users = new Users();
      db.collection('users', (err, collection) => {
        if (err) return reject(err);
        users._collection = collection;
        resolve(users);
      });
    });
  }
  
  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove all users: ' + err.message));
      })
    });
  }
  
  public removeByUserId(userid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ userid: userid}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove user: ' + err.message));
      })
    });
  }
  
  public createRandomUser(prefix?: string): IUser {
    prefix = prefix || '';
    let randomPart = Random.str(5);
    return { 
      userid: `U${prefix}${randomPart}`,
      name: `Random user ${prefix}${randomPart}`,
      modified: new Date
    };
  }
  
  public insertUser(user: IUser): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(user).then((result) => {
        resolve(result.insertedId);
      }).catch((err) => {
        reject(new Error('Could not insert user: ' + err.message));
      })
    });
  }
  
  public insertRandomUser(prefix?: string): Promise<IUser> {
    let randomUser = this.createRandomUser(prefix);
    return new Promise<IUser>((resolve, reject) => {
      this._collection.insertOne(randomUser).then((result) => {
        randomUser._id = result.insertedId;
        resolve(randomUser);
      }).catch((err) => {
        reject(new Error('Could not insert random user: ' + err.message));
      })
    });
  }
  
  public findbyUserId(userid: string): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
      this._collection.find({ userid: userid }).limit(1).toArray().then((users: IUser[]) => {
        resolve(users.length > 0 ? users[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding user: ' + err.message));
      });
    });
  }
}