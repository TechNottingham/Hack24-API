import {Db, Collection, ObjectID} from 'mongodb';
import {Random} from '../utils/random';

export interface Attendee {
  _id?: ObjectID;
  attendeeid: string;
  slackid: string;
}

export class Attendees {

  public static Create(db: Db): Promise<Attendees> {
    return new Promise<Attendees>((resolve, reject) => {
      let attendees = new Attendees();
      db.collection('attendees', (err, collection) => {
        if (err) {
          return reject(err);
        }
        attendees._collection = collection;
        resolve(attendees);
      });
    });
  }

  private _collection: Collection;

  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove all attendees: ' + err.message));
      });
    });
  }

  public removeByAttendeeId(attendeeid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ attendeeid: attendeeid }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove attendee: ' + err.message));
      });
    });
  }

  public createRandomAttendee(prefix?: string, withSlackId: boolean = false): Attendee {
    prefix = prefix || '';
    let randomPart = Random.str(5);
    return {
      attendeeid: `testattendee+${prefix}${randomPart}@hack24.co.uk`,
      slackid: withSlackId ? `U${prefix}${randomPart}` : undefined,
    };
  }

  public insertAttendee(attendee: Attendee): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(attendee).then((result) => {
        resolve(result.insertedId);
      }).catch((err) => {
        reject(new Error('Could not insert attendee: ' + err.message));
      });
    });
  }

  public insertRandomAttendee(prefix?: string, withSlackId: boolean = false): Promise<Attendee> {
    let randomAttendee = this.createRandomAttendee(prefix, withSlackId);
    return new Promise<Attendee>((resolve, reject) => {
      this._collection.insertOne(randomAttendee).then((result) => {
        randomAttendee._id = result.insertedId;
        resolve(randomAttendee);
      }).catch((err) => {
        reject(new Error('Could not insert random attendee: ' + err.message));
      });
    });
  }

  public findbyAttendeeId(attendeeid: string): Promise<Attendee> {
    return new Promise<Attendee>((resolve, reject) => {
      this._collection.find({ attendeeid: attendeeid }).limit(1).toArray().then((attendees: Attendee[]) => {
        resolve(attendees.length > 0 ? attendees[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding attendee: ' + err.message));
      });
    });
  }
}
