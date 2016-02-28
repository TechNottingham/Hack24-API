"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';
import {JSONApi, UserResource, UsersResource, TeamResource} from './resources'

describe('Users resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('GET user by ID', () => {

    let user: IUser;
    let statusCode: number;
    let contentType: string;
    let response: UserResource.TopLevelDocument;

    before(async (done) => {
      user = await MongoDB.Users.insertRandomUser();
      
      api.get('/users/' + user.userid)
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
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

    it('should not return a team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data, null);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(user.userid).then(done, done);
    });

  });
  
  describe('GET users in teams', () => {

    let user: IUser;
    let otherUser: IUser;
    let team: ITeam;
    let otherTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: UsersResource.TopLevelDocument;

    before(async (done) => {
      await MongoDB.Users.removeAll();
      
      user = await MongoDB.Users.insertRandomUser('A');
      otherUser = await MongoDB.Users.insertRandomUser('B');
      
      team = await MongoDB.Teams.insertRandomTeam([user._id], 'A');
      otherTeam = await MongoDB.Teams.insertRandomTeam([otherUser._id], 'B');
      
      api.get(`/users`)
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
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
      assert.strictEqual(response.links.self, `/users`);
    });

    it('should return the first user', () => {
      let thisUser = response.data[0];
      assert.strictEqual(thisUser.type, 'users');
      assert.strictEqual(thisUser.id, user.userid);
      assert.strictEqual(thisUser.attributes.name, user.name);
      assert.strictEqual(thisUser.relationships.team.links.self, `/users/${user.userid}/team`);
      assert.strictEqual(thisUser.relationships.team.data.type, 'teams');
      assert.strictEqual(thisUser.relationships.team.data.id, team.teamid);
    });

    it('should return the second user', () => {
      let thisUser = response.data[1];
      assert.strictEqual(thisUser.type, 'users');
      assert.strictEqual(thisUser.id, otherUser.userid);
      assert.strictEqual(thisUser.attributes.name, otherUser.name);
      assert.strictEqual(thisUser.relationships.team.links.self, `/users/${otherUser.userid}/team`);
      assert.strictEqual(thisUser.relationships.team.data.type, 'teams');
      assert.strictEqual(thisUser.relationships.team.data.id, otherTeam.teamid);
    });

    it('should include the first team', () => {
      let includedTeam = <TeamResource.ResourceObject> response.included[0];
      assert.strictEqual(includedTeam.links.self, `/teams/${team.teamid}`);
      assert.strictEqual(includedTeam.id, team.teamid);
      assert.strictEqual(includedTeam.attributes.name, team.name);
      assert.strictEqual(includedTeam.attributes.motto, team.motto);
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${team.teamid}/members`);
      assert.strictEqual(includedTeam.relationships.members.data.length, 1);
      assert.strictEqual(includedTeam.relationships.members.data[0].type, 'users');
      assert.strictEqual(includedTeam.relationships.members.data[0].id, user.userid);
    });

    it('should include the second team', () => {
      let includedTeam = <TeamResource.ResourceObject> response.included[1];
      assert.strictEqual(includedTeam.links.self, `/teams/${otherTeam.teamid}`);
      assert.strictEqual(includedTeam.id, otherTeam.teamid);
      assert.strictEqual(includedTeam.attributes.name, otherTeam.name);
      assert.strictEqual(includedTeam.attributes.motto, otherTeam.motto);
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${otherTeam.teamid}/members`);
      assert.strictEqual(includedTeam.relationships.members.data.length, 1);
      assert.strictEqual(includedTeam.relationships.members.data[0].type, 'users');
      assert.strictEqual(includedTeam.relationships.members.data[0].id, otherUser.userid);
    });

    after((done) => {
      Promise.all([
        MongoDB.Teams.removeByTeamId(team.teamid),
        MongoDB.Teams.removeByTeamId(otherTeam.teamid),
        MongoDB.Users.removeByUserId(user.userid),
        MongoDB.Users.removeByUserId(otherUser.userid)
      ]).then(() => done(), done);
    });

  });

  describe('GET user by ID in team', () => {

    let user: IUser;
    let otherUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: UserResource.TopLevelDocument;
    let includedTeam: TeamResource.ResourceObject;
    let includedUser: UserResource.ResourceObject;

    before(async (done) => {
      user = await MongoDB.Users.insertRandomUser('A');
      otherUser = await MongoDB.Users.insertRandomUser('B');
      team = await MongoDB.Teams.insertRandomTeam([user._id, otherUser._id]);
      
      api.get(`/users/${user.userid}`)
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          includedTeam = <TeamResource.ResourceObject> response.included.find((include) => include.type === 'teams');
          includedUser = <UserResource.ResourceObject> response.included.find((include) => include.type === 'users');
          
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
    let response: UserResource.TopLevelDocument;

    before((done) => {
      user = MongoDB.Users.createRandomUser();
      
      let requestDoc: UserResource.TopLevelDocument = {
        data: {
          type: 'users',
          id: user.userid,
          attributes: {
            name: user.name
          }
        }
      };

      api.post('/users')
        .send(requestDoc)
        .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
        .end(async (err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdUser = await MongoDB.Users.findbyUserId(user.userid);
          done();
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
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async (done) => {
      user = await MongoDB.Users.insertRandomUser();
      
      let requestDoc: UserResource.TopLevelDocument = {
        data: {
          type: 'users',
          id: user.userid,
          attributes: {
            name: user.name
          }
        }
      };

      api.post('/users')
        .send(requestDoc)
        .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          done();
        });
    });

    it('should respond with status code 409 Conflict', () => {
      assert.strictEqual(statusCode, 409);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return an error with status code 409 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '409');
      assert.strictEqual(response.errors[0].title, 'Resource ID already exists.');
    });

    after((done) => {
      MongoDB.Users.removeByUserId(user.userid).then(done, done);
    });

  });

  describe('GET missing user by ID', () => {

    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before((done) => {
      api.get('/users/U' + Random.int(10000, 99999))
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          done();
        });
    });

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should respond with the expected "Resource not found" error', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '404');
      assert.strictEqual(response.errors[0].title, 'Resource not found.');
    });

  });
  
  describe('POST new user without authentication', () => {

    let userId: string;
    let createdUser: IUser;
    let statusCode: number;
    let contentType: string;
    let authenticateHeader: string;
    let response: JSONApi.TopLevelDocument;

    before((done) => {
      userId = 'U' + Random.int(10000, 99999);
      api.post('/users')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          authenticateHeader = res.header['www-authenticate'];
          response = res.body;

          done();
        });
    });

    it('should respond with status code 401 Unauthorized', () => {
      assert.strictEqual(statusCode, 401);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should respond with WWW-Authenticate header for basic realm "api.hack24.co.uk"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="api.hack24.co.uk"');
    });

    it('should respond with the expected "Unauthorized" error', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '401');
      assert.strictEqual(response.errors[0].title, 'Unauthorized.');
      assert.strictEqual(response.errors[0].detail, 'An authentication header is required.');
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
    let response: JSONApi.TopLevelDocument;

    before((done) => {
      userId = 'U' + Random.int(10000, 99999);
      api.post('/users')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .auth('hackbot', 'incorrect_password')
        .end((err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          done();
        });
    });

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should respond with the expected "Forbidden" error', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '403');
      assert.strictEqual(response.errors[0].title, 'Access is forbidden.');
      assert.strictEqual(response.errors[0].detail, 'Only hackbot has access to do that.');
    });

    it('should not create the user document', (done) => {
      MongoDB.Users.findbyUserId(userId).then((user) => {
        done(user ? new Error('User was created') : null);
      }).catch(done);
    });

    after((done) => {
      MongoDB.Users.removeByUserId(userId).then(done, done);
    });

  });

});