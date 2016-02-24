"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, TeamsResource, TeamResource, UserResource} from './resources'

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new team', () => {

    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before((done) => {
      team = MongoDB.Teams.createRandomTeam();
      
      let teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name
          }
        }
      };
      
      api.post('/teams')
        .send(teamRequest)
        .end(async (err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
          done();
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams');
    });

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid);
    });

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name);
    });

    it('should create the team with the expected id and name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, team.teamid);
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    it('should not add any members to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 0);
    });

    after((done) => {
      MongoDB.Teams.removeByTeamId(team.teamid).then(done, done);
    });

  });

  describe('POST new team with members', () => {

    let user: IUser;
    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async (done) => {
      user = await MongoDB.Users.insertRandomUser();
      team = await MongoDB.Teams.createRandomTeam();
      
      let teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name
          },
          relationships: {
            members: {
              data: [{ type: 'users', id: user.userid}]
            }
          }
        }
      };
      
      api.post('/teams')
        .send(teamRequest)
        .end(async (err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
          done();
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams');
    });

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid);
    });

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name);
    });

    it('should create the team with the expected id and name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, team.teamid);
      assert.strictEqual(createdTeam.name, team.name);
    });

    it('should add the member to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 1);
      assert.strictEqual(createdTeam.members[0].equals(user._id), true);
    });

    after((done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(user.userid),
        MongoDB.Teams.removeByTeamId(team.teamid)
      ]).then(() => done(), done);
    });

  });

  describe('POST team which already exists', () => {

    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async (done) => {
      team = await MongoDB.Teams.insertRandomTeam();
      
      let teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name
          }
        }
      };
      
      api.post('/teams')
        .send(teamRequest)
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
      MongoDB.Teams.removeByTeamId(team.teamid).then(done, done);
    });

  });
  
  describe('GET teams', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let thirdUser: IUser;
    let firstTeam: ITeam;
    let secondTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamsResource.TopLevelDocument;

    before(async (done) => {
      await MongoDB.Teams.removeAll();
      
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      thirdUser = await MongoDB.Users.insertRandomUser('C');
      
      firstTeam = await MongoDB.Teams.insertRandomTeam([firstUser._id], 'A');
      secondTeam = await MongoDB.Teams.insertRandomTeam([secondUser._id, thirdUser._id], 'B');
            
      api.get('/teams')
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

    it('should return the teams resource object self link', () => {
      assert.strictEqual(response.links.self, '/teams');
    });

    it('should return the first team', () => {
      let teamResponse = response.data[0];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, firstTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, firstTeam.name);
      
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[0].id, firstUser.userid);
    });

    it('should return the second team', () => {
      let teamResponse = response.data[1];
      
      assert.strictEqual(teamResponse.type, 'teams');
      assert.strictEqual(teamResponse.id, secondTeam.teamid);
      assert.strictEqual(teamResponse.attributes.name, secondTeam.name);
      
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[0].id, secondUser.userid);
      
      assert.strictEqual(teamResponse.relationships.members.data[1].type, 'users');
      assert.strictEqual(teamResponse.relationships.members.data[1].id, thirdUser.userid);
    });

    it('should include the related members', () => {
      assert.strictEqual(response.included.length, 3);
      assert.strictEqual(response.included.filter((obj) => obj.type === 'users').length, 3);
    });

    it('should include each expected user', () => {
      let users = <UserResource.ResourceObject[]> response.included;
      
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`);
      assert.strictEqual(users[0].id, firstUser.userid);
      assert.strictEqual(users[0].attributes.name, firstUser.name);
      
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`);
      assert.strictEqual(users[1].id, secondUser.userid);
      assert.strictEqual(users[1].attributes.name, secondUser.name);
      
      assert.strictEqual(users[2].links.self, `/users/${thirdUser.userid}`);
      assert.strictEqual(users[2].id, thirdUser.userid);
      assert.strictEqual(users[2].attributes.name, thirdUser.name);
    });

    after((done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(firstUser.userid),
        MongoDB.Users.removeByUserId(secondUser.userid),
        MongoDB.Users.removeByUserId(thirdUser.userid),
  
        MongoDB.Teams.removeByTeamId(firstTeam.teamid),
        MongoDB.Teams.removeByTeamId(secondTeam.teamid)
      ]).then(() => done(), done);
    });

  });
  
  describe('GET team by slug (teamid)', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before(async (done) => {
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id]);
      
      api.get(`/teams/${team.teamid}`)
        .set('Accept', 'application/json')
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

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`);
    });

    it('should return the team primary data', () => {
      assert.strictEqual(response.data.type, 'teams');
      assert.strictEqual(response.data.id, team.teamid);
      assert.strictEqual(response.data.attributes.name, team.name);
    });

    it('should return the user relationships', () => {
      assert.strictEqual(response.data.relationships.members.data[0].type, 'users');
      assert.strictEqual(response.data.relationships.members.data[0].id, firstUser.userid);
      assert.strictEqual(response.data.relationships.members.data[1].type, 'users');
      assert.strictEqual(response.data.relationships.members.data[1].id, secondUser.userid);
    });

    it('should include the related members', () => {
      assert.strictEqual(response.included.length, 2);
      assert.strictEqual(response.included.filter((obj) => obj.type === 'users').length, 2);
    });

    it('should include each expected user', () => {
      let users = <UserResource.ResourceObject[]> response.included;
      
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`);
      assert.strictEqual(users[0].id, firstUser.userid);
      assert.strictEqual(users[0].attributes.name, firstUser.name);
      
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`);
      assert.strictEqual(users[1].id, secondUser.userid);
      assert.strictEqual(users[1].attributes.name, secondUser.name);
    });

    after((done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(firstUser.userid),
        MongoDB.Users.removeByUserId(secondUser.userid),
        MongoDB.Teams.removeByTeamId(team.teamid)
      ]).then(() => done(), done);
    });

  });
  
  describe('GET team by slug (teamid) which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let response: TeamResource.TopLevelDocument;

    before((done) => {
      api.get(`/teams/does not exist`)
        .set('Accept', 'application/json')
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

});