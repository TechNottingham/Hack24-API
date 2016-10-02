import {Db, Collection, ObjectID} from 'mongodb';
import {Random} from '../utils/random';

export interface ITeam {
  _id?: ObjectID;
  teamid: string;
  name: string;
  motto: string;
  members: ObjectID[];
  entries: ObjectID[];
}

export class Teams {
  private _collection: Collection;

  public static Create(db: Db): Promise<Teams> {
    return new Promise<Teams>((resolve, reject) => {
      var teams = new Teams();
      db.collection('teams', (err, collection) => {
        if (err) return reject(err);
        teams._collection = collection;
        resolve(teams);
      });
    });
  }

  public removeAll(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteMany({}).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove all teams: ' + err.message));
      })
    });
  }

  public removeByName(name: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ name: name }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove team: ' + err.message));
      })
    });
  }

  public removeByTeamId(teamid: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ teamid: teamid }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove team: ' + err.message));
      })
    });
  }

  public createRandomTeam(prefix?: string): ITeam {
    prefix = prefix || '';
    let randomPart = Random.str(5);
    return {
      teamid: `random-team-${prefix}${randomPart}`,
      name: `Random Team ${prefix}${randomPart}`,
      motto: `Random motto ${randomPart}`,
      members: [],
      entries: []
    };
  }

  public insertTeam(team: ITeam): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(team).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not insert team: ' + err.message));
      })
    });
  }

  public insertRandomTeam(members?: ObjectID[], prefix?: string): Promise<ITeam> {
    const randomTeam = this.createRandomTeam(prefix);
    randomTeam.members = members || [];
    return new Promise<ITeam>((resolve, reject) => {
      this._collection.insertOne(randomTeam).then((result) => {
        randomTeam._id = result.insertedId;
        resolve(randomTeam);
      }).catch((err) => {
        reject(new Error('Could not insert random team: ' + err.message));
      })
    });
  }

  public findbyName(name: string): Promise<ITeam> {
    return new Promise<ITeam>((resolve, reject) => {
      this._collection.find({ name: name }).limit(1).toArray().then((teams: ITeam[]) => {
        resolve(teams.length > 0 ? teams[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding team: ' + err.message));
      });
    });
  }

  public findbyTeamId(teamid: string): Promise<ITeam> {
    return new Promise<ITeam>((resolve, reject) => {
      this._collection.find({ teamid: teamid }).limit(1).toArray().then((teams: ITeam[]) => {
        resolve(teams.length > 0 ? teams[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding team: ' + err.message));
      });
    });
  }
}