"use strict";

import {Db, Collection, ObjectID} from 'mongodb';
import {Random} from '../utils/random';

export interface IHack {
  _id?: ObjectID;
  hackid: string;
  name: string;
}

export class Hacks {
  private _collection: Collection;
  
  public static Create(db: Db): Promise<Hacks> {
    return new Promise<Hacks>((resolve, reject) => {
      var hacks = new Hacks();
      db.collection('hacks', (err, collection) => {
        if (err) return reject(err);
        hacks._collection = collection;
        resolve(hacks);
      });
    });
  }
  
  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove all hacks: ' + err.message));
      })
    });
  }
  
  public removeByName(name: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ name: name }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove hack: ' + err.message));
      })
    });
  }
  
  public removeByHackId(hackid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ hackid: hackid }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove hack: ' + err.message));
      })
    });
  }
  
  public createRandomHack(prefix?: string): IHack {
    prefix = prefix || '';
    let randomPart = Random.str(5);
    return { 
      hackid: `random-hack-${prefix}${randomPart}`,
      name: `Random Hack ${prefix}${randomPart}`
    };
  }
  
  public insertHack(hack: IHack): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(hack).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not insert hack: ' + err.message));
      })
    });
  }
  
  public insertRandomHack(prefix?: string): Promise<IHack> {
    let randomHack = this.createRandomHack(prefix);
    return new Promise<IHack>((resolve, reject) => {
      this._collection.insertOne(randomHack).then((result) => {
        randomHack._id = result.insertedId;
        resolve(randomHack);
      }).catch((err) => {
        reject(new Error('Could not insert random hack: ' + err.message));
      })
    });
  }
  
  public findbyName(name: string): Promise<IHack> {
    return new Promise<IHack>((resolve, reject) => {
      this._collection.find({ name: name }).limit(1).toArray().then((hacks: IHack[]) => {
        resolve(hacks.length > 0 ? hacks[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding hack: ' + err.message));
      });
    });
  }
  
  public findByHackId(hackid: string): Promise<IHack> {
    return new Promise<IHack>((resolve, reject) => {
      this._collection.find({ hackid: hackid }).limit(1).toArray().then((hacks: IHack[]) => {
        resolve(hacks.length > 0 ? hacks[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding hack: ' + err.message));
      });
    });
  }
}