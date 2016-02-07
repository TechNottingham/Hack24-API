import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';

describe('Users resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new user', () => {

    let user: IUser;
    let createdUser: IUser;
    let statusCode: number;
    let contentType: string;

    before((done) => {
      user = {
        id: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };

      api.post('/users')
        .send({ id: user.id, name: user.name })
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];

          MongoDB.Users.findbyId(user.id).then((user) => {
            createdUser = user;
            done();
          }).catch(done);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should create the user with the expected ID and name', () => {
      assert.ok(createdUser, 'User not found');
      assert.strictEqual(createdUser.id, user.id);
      assert.strictEqual(createdUser.name, user.name);
    });

    after((done) => {
      MongoDB.Users.removeById(user.id).then(done).catch(done);
    });

  });

  describe('POST user with existing ID', () => {

    let user: IUser;
    let statusCode: number;

    before((done) => {
      user = {
        id: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };

      MongoDB.Users.createUser(user).then(() => {
        api.post('/users')
          .send({ id: user.id, name: 'Name_' + Random.str(5) })
          .set('Accept', 'application/json')
          .end((err, res) => {
            if (err) return done(err);

            statusCode = res.status;
            done();
          });
      });
    });

    it('should respond with status code 409 Conflict', () => {
      assert.strictEqual(statusCode, 409);
    });

    after((done) => {
      MongoDB.Users.removeById(user.id).then(done).catch(done);
    });

  });

  describe('GET user by ID', () => {

    let user: IUser;
    let testStart: Date;
    let statusCode: number;
    let contentType: string;
    let body;

    before((done) => {
      user = {
        id: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };
      
      testStart = new Date;

      MongoDB.Users.createUser(user).then(() => {
        api.get('/users/' + user.id)
          .set('Accept', 'application/json')
          .end((err, res) => {
            if (err) return done(err);

            statusCode = res.status;
            contentType = res.header['content-type'];
            body = res.body;
            
            done();
          });
      });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should return the expected user', () => {
      assert.strictEqual(body.id, user.id);
      assert.strictEqual(body.name, user.name);
      assert.strictEqual(body.modified, user.modified.toISOString());
    });

    after((done) => {
      MongoDB.Users.removeById(user.id).then(done).catch(done);
    });

  });

  describe('GET missing user by ID', () => {

    let statusCode: number;

    before((done) => {
      api.get('/users/U' + Random.int(10000, 99999))
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          
          done();
        });
    });

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404);
    });

  });

});