"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';
import {UserResponse, TeamsResponse} from './models/responses'

describe('Users resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('GET user by ID', () => {

    let user: IUser;
    let statusCode: number;
    let contentType: string;
    let response: UserResponse.TopLevelDocument;

    before((done) => {
      user = {
        userid: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };
      
      MongoDB.Users.createUser(user).then(() => {
        api.get('/users/' + user.userid)
          .set('Accept', 'application/json')
          .end((err, res) => {
            if (err) return done(err);

            statusCode = res.status;
            contentType = res.header['content-type'];
            response = res.body;
            
            done();
          });
      });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`);
    });

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users');
    });

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid);
    });

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name);
    });

    it('should return the team relationship self link', () => {
      assert.strictEqual(response.data.relationships.team.links.self, `/users/${user.userid}/team`);
    });

    it('should not return a team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data, null);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(user.userid).then(done, done);
    });

  });

  describe('GET user by ID in team', () => {

    let user: IUser;
    let otherUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: UserResponse.TopLevelDocument;
    let includedTeam: TeamsResponse.ResourceObject;
    let includedUser: UserResponse.ResourceObject;

    before(async (done) => {
      user = await MongoDB.Users.createRandomUser('A');
      otherUser = await MongoDB.Users.createRandomUser('B');
      team = await MongoDB.Teams.createRandomTeam([user._id, otherUser._id]);
      
      api.get(`/users/${user.userid}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          includedTeam = <TeamsResponse.ResourceObject> response.included.find((element) => element.type === 'teams');
          includedUser = <UserResponse.ResourceObject> response.included.find((element) => element.type === 'users');
          
          done();
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`);
    });

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users');
    });

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid);
    });

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name);
    });

    it('should return the team relationship self link', () => {
      assert.strictEqual(response.data.relationships.team.links.self, `/users/${user.userid}/team`);
    });

    it('should return the team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data.type, 'teams');
      assert.strictEqual(response.data.relationships.team.data.id, team.teamid);
    });

    it('should include the related team', () => {
      assert.ok(includedTeam, 'Included team missing');
      assert.strictEqual(includedTeam.links.self, `/teams/${team.teamid}`);
      assert.strictEqual(includedTeam.id, team.teamid);
      assert.strictEqual(includedTeam.attributes.name, team.name);
    });

    it('should include the related team members', () => {
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${team.teamid}/members`);
      assert.strictEqual(includedTeam.relationships.members.data.length, 2);
      
      let relatedUser = includedTeam.relationships.members.data[0];
      assert.strictEqual(relatedUser.type, 'users');
      assert.strictEqual(relatedUser.id, user.userid);

      let relatedOtherUser = includedTeam.relationships.members.data[1];
      assert.strictEqual(relatedOtherUser.type, 'users');
      assert.strictEqual(relatedOtherUser.id, otherUser.userid);
    });

    it('should include the related team', () => {
      assert.ok(includedUser, 'Included user missing');
      assert.strictEqual(includedUser.id, otherUser.userid);
      assert.strictEqual(includedUser.attributes.name, otherUser.name);
    });

    it('should include the related other user team relationship', () => {
      assert.strictEqual(includedUser.relationships.team.links.self, `/teams/${team.teamid}`);
      assert.strictEqual(includedUser.relationships.team.data.type, 'teams');
      assert.strictEqual(includedUser.relationships.team.data.id, team.teamid);
    });

    after((done) => {
      Promise.all([
        MongoDB.Teams.removeByTeamId(team.teamid),
        MongoDB.Users.removeByUserId(user.userid),
        MongoDB.Users.removeByUserId(otherUser.userid)
      ]).then(() => done(), done);
    });

  });

  describe('POST new user', () => {

    let user: IUser;
    let createdUser: IUser;
    let statusCode: number;
    let contentType: string;
    let response: UserResponse.TopLevelDocument;

    before((done) => {
      user = {
        userid: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };

      api.post('/users')
        .send({ userid: user.userid, name: user.name })
        .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          MongoDB.Users.findbyUserId(user.userid).then((user) => {
            createdUser = user;
            done();
          }).catch(done);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`);
    });

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users');
    });

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid);
    });

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name);
    });

    it('should create the user with the expected ID and name', () => {
      assert.ok(createdUser, 'User not found');
      assert.strictEqual(createdUser.userid, user.userid);
      assert.strictEqual(createdUser.name, user.name);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(user.userid).then(done).catch(done);
    });

  });

  describe('POST user with existing ID', () => {

    let user: IUser;
    let statusCode: number;

    before((done) => {
      user = {
        userid: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };

      MongoDB.Users.createUser(user).then(() => {
        api.post('/users')
          .send({ userid: user.userid, name: 'Name_' + Random.str(5) })
          .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
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
      MongoDB.Users.removeByUserId(user.userid).then(done).catch(done);
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
  
  describe('POST new user without authentication', () => {

    let userId: string;
    let createdUser: IUser;
    let statusCode: number;
    let contentType: string;
    let authenticateHeader: string;
    let body: string;

    before((done) => {
      userId = 'U' + Random.int(10000, 99999);
      api.post('/users')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          authenticateHeader = res.header['www-authenticate'];
          body = res.text;

          done();
        });
    });

    it('should respond with status code 401 Unauthorized', () => {
      assert.strictEqual(statusCode, 401);
    });

    it('should respond with WWW-Authenticate header for basic realm "api.hack24.co.uk"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="api.hack24.co.uk"');
    });

    it('should return text/plain content with charset utf-8', () => {
      assert.strictEqual(contentType, 'text/plain; charset=utf-8');
    });

    it('should respond with body text "Unauthorized"', () => {
      assert.strictEqual(body, 'Unauthorized');
    });

    it('should not create the user document', (done) => {
      MongoDB.Users.findbyUserId(userId).then((user) => {
        done(user ? new Error('User was created') : null);
      }).catch(done);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(userId).then(done).catch(done);
    });

  });
  
  describe('POST new user with incorrect authentication', () => {

    let userId: string;
    let createdUser: IUser;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before((done) => {
      userId = 'U' + Random.int(10000, 99999);
      api.post('/users')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .auth('hackbot', 'incorrect_password')
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          done();
        });
    });

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403);
    });

    it('should return text/plain content with charset utf-8', () => {
      assert.strictEqual(contentType, 'text/plain; charset=utf-8');
    });

    it('should respond with body text "Forbidden"', () => {
      assert.strictEqual(body, 'Forbidden');
    });

    it('should not create the user document', (done) => {
      MongoDB.Users.findbyUserId(userId).then((user) => {
        done(user ? new Error('User was created') : null);
      }).catch(done);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(userId).then(done).catch(done);
    });

  });

});