import {spawn, ChildProcess} from 'child_process';
import {MongoClient, Db, Collection} from 'mongodb';

export interface IUser {
  id: string;
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
  
  public removeById(id: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.deleteOne({ id: id }).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not remove user: ' + err.message));
      })
    });
  }
  
  public createUser(user: IUser): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._collection.insertOne(user).then(() => {
        resolve();
      }).catch((err) => {
        reject(new Error('Could not insert user: ' + err.message));
      })
    });
  }
  
  public findbyId(id: string): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
      this._collection.find({ id: id }).limit(1).toArray().then((users: IUser[]) => {
        resolve(users.length > 0 ? users[0] : null);
      }).catch((err) => {
        reject(new Error('Error when finding user: ' + err.message));
      });
    });
  }
}

export class MongoDB {
  private static _spawn: ChildProcess;
  private static _db: Db;
  private static _users: Users;
  
  static get Db(): Db {
    return this._db;
  }
  
  static get Users(): Users {
    return this._users;
  }
  
  static start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      
      this.connectMongo().then((db) => {
        resolve(this.loadDb(db));
      }).catch((err) => {
        this._spawn = this.spawn();
        
        this.connectMongo().then((db) => {
          this._db = db;
          resolve();
        }).catch((err) => {
          reject(err);
        });
        
      });
      
    });
  }
  
  private static loadDb(db: Db): Promise<void> {
    return new Promise<void>((resolve, reject) => {    
      this._db = db;
      Users.Create(db).then((users) => {
        this._users = users;
        resolve();
      });
    })
  }
  
  private static connectMongo(): Promise<Db> {
    return MongoClient.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
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
      if (code !== 0) return console.error(new Error('MongoDB finished with non-zero exit code (' + code + ')'));
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