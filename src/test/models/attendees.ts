"use strict";

import {Db, Collection, ObjectID} from 'mongodb';
import {Random} from '../utils/random';

export interface IAttendee {
  _id?: ObjectID;
  attendeeid: string;
}

export class Attendees {
  private _collection: Collection;
  
  public static Create(db: Db): Promise<Attendees> {
    return new Promise<Attendees>((resolve, reject) => {
      var attendees = new Attendees();
      db.collection('attendees', (err, collection) => {
        if (err) return reject(err);
        attendees._collection = collection;
        resolve(attendees);
      });
    });
  }
  
  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove all attendees: ' + err.message));
      })
    });
  }
  
  public removeByAttendeeId(attendeeid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ attendeeid: attendeeid}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove attendee: ' + err.message));
      })
    });
  }
  
  public createRandomAttendee(prefix?: string): IAttendee {
    prefix = prefix || '';
    let randomPart = Random.str(5);
    return {
      attendeeid: `testattendee+${prefix}${randomPart}@hack24.co.uk`
    };
  }
  
  public insertAttendee(attendee: IAttendee): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(attendee).then((result) => {
        resolve(result.insertedId);
      }).catch((err) => {
        reject(new Error('Could not insert attendee: ' + err.message));
      })
    });
  }
  
  public insertRandomAttendee(prefix?: string): Promise<IAttendee> {
    let randomAttendee = this.createRandomAttendee(prefix);
    return new Promise<IAttendee>((resolve, reject) => {
      this._collection.insertOne(randomAttendee).then((result) => {
        randomAttendee._id = result.insertedId;
        resolve(randomAttendee);
      }).catch((err) => {
        reject(new Error('Could not insert random attendee: ' + err.message));
      })
    });
  }
  
  public findbyAttendeeId(attendeeid: string): Promise<IAttendee> {
    return new Promise<IAttendee>((resolve, reject) => {
      this._collection.find({ attendeeid: attendeeid }).limit(1).toArray().then((attendees: IAttendee[]) => {
        resolve(attendees.length > 0 ? attendees[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding attendee: ' + err.message));
      });
    });
  }
}