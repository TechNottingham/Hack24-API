import * as assert from 'assert';
import {spawn, fork, ChildProcess} from 'child_process';
import * as mongoose from 'mongoose';

class ApiServer {
  private static _api: ChildProcess;
  
  static start(): void {
    
    console.log('Starting API server...');
    
    this._api = fork('../server/server', [], {
      cwd: process.cwd(),
      env: { PORT: 12123 }
    })
  
    if (process.env.DEBUG) {
      this._api.stdout.setEncoding('utf8');
      this._api.stderr.setEncoding('utf8');
      this._api.stdout.on('data', console.log);
      this._api.stderr.on('data', console.error);
    }
  
    this._api.on('close', function (code) {
      if (code !== 0) return console.error(new Error('API closed with non-zero exit code (' + code + ')'));
      console.log('API closed.');
    });
  
    this._api.on('error', (err) => {
      throw new Error('Unable to start API: ' + err.message);
    });
  }
  
  static stop(): void {
    if (!this._api) return;
    console.log('Stopping API server...');
    this._api.kill('SIGINT');
  }
}

class MongoDb {
  private static _spawn: ChildProcess;
  
  static start(cb: (err?) => void): void {
    mongoose.connection.once('open', (ref) => {
      cb();
    });
    
    let errors = 0;
    
    mongoose.connection.on('error', (err) => {
      if (errors > 0) return cb(new Error('Unable to spin up MongoDB.'));
      errors++;
      this._spawn = this.spawn();
      this.connectMongo();
    });
    
    this.connectMongo();
  }
  
  private static connectMongo() {
    mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost/hack24db');
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
  
  static stop(): void {
    if (!this._spawn) {
      mongoose.connection.close();
      return;
    }    
    
    console.log('Stopping MongoDB server...');
    this._spawn.kill('SIGINT');
  }
}

before((done) => {
  MongoDb.start((err) => {
    if (err) return done(err);
    ApiServer.start();
    done();
  });
});

after(() => {
  ApiServer.stop();
  MongoDb.stop();
});