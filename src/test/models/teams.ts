import {Db, Collection, ObjectID} from 'mongodb';

export interface ITeam {
  name: string;
  members: ObjectID[]
}

export interface ITeamResponse {
  name: string;
  members: string[];
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
  
  public createTeam(team: ITeam): Promise<ObjectID> {
    return new Promise<ObjectID>((resolve, reject) => {
      this._collection.insertOne(team).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not insert team: ' + err.message));
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
}