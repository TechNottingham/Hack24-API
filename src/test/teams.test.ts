"use strict";

import * as assert from 'assert';
import {ObjectID} from 'mongodb';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeamRequest, ITeam, ITeamResponse} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new team', () => {

    let teamName: string;
    let expectedTeamId: string;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before((done) => {
      let randomPart = Random.str(5);
      
      teamName = `Team ${randomPart}`;
      expectedTeamId = `team-${randomPart}`;
      
      let teamRequest: ITeamRequest = {
        name: teamName,
        members: []
      };
      
      api.post('/teams')
        .send(teamRequest)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          responseBody = res.body;

          MongoDB.Teams.findbyTeamId(expectedTeamId).then((team) => {
            createdTeam = team;
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

    it('should create the team with the expected name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, expectedTeamId);
      assert.strictEqual(createdTeam.name, teamName);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    it('should return the created team', () => {
      assert.strictEqual(responseBody.teamid, expectedTeamId);
      assert.strictEqual(responseBody.name, teamName);
      assert.strictEqual(responseBody.members.length, 0);
    });

    after((done) => {
      MongoDB.Teams.removeByTeamId(expectedTeamId).then(done, done);
    });

  });

  describe('POST new team with members', () => {

    let userId: string;
    let expectedUserObjectId: ObjectID;
    let teamName: string;
    let expectedTeamId: string;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before(async (done) => {
      userId = `U${Random.int(10000, 99999)}`;
      
      let user: IUser = {
        userid: userId,
        name: `Name_${Random.str(5)}`,
        modified: new Date
      };
      
      expectedUserObjectId = await MongoDB.Users.createUser(user);
        
      let randomPart = Random.str(5);
      teamName = `ú-x.€ ${randomPart}`;
      expectedTeamId = `u-xeuro-${randomPart}`;
      
      let teamRequest: ITeamRequest = {
        name: teamName,
        members: [user.userid]
      };
    
      api.post('/teams')
        .send(teamRequest)
        .set('Accept', 'application/json')
        .end(async (err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          responseBody = res.body;

          createdTeam = await MongoDB.Teams.findbyTeamId(expectedTeamId);
          done();
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should create the team with the expected name and the expected members', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, expectedTeamId);
      assert.strictEqual(createdTeam.name, teamName);
      assert.strictEqual(createdTeam.members.length, 1);
      assert.ok(createdTeam.members[0].equals(expectedUserObjectId), 'user ObjectIDs do not match');
    });

    it('should return the created team', () => {
      assert.strictEqual(responseBody.teamid, expectedTeamId);
      assert.strictEqual(responseBody.name, teamName);
      assert.strictEqual(responseBody.members.length, 1);
      assert.strictEqual(responseBody.members[0], userId);
    });

    after(async (done) => {
      try {
        await MongoDB.Users.removeByUserId(userId);
        await MongoDB.Teams.removeByTeamId(expectedTeamId);
        done();
      } catch (err) {
        done(err);
      }
    });

  });

  describe('POST team which already exists', () => {

    let randomTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async (done) => {
      randomTeam = await MongoDB.Teams.createRandomTeam();
      
      let teamRequest: ITeamRequest = {
        name: randomTeam.name,
        members: []
      };
      
      api.post('/teams')
        .send(teamRequest)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;
          
          done();
        });
    });

    it('should respond with status code 409 Conflict', () => {
      assert.strictEqual(statusCode, 409);
    });

    it('should return text/plain content with charset utf-8', () => {
      assert.strictEqual(contentType, 'text/plain; charset=utf-8');
    });

    it('should respond with body text "Conflict"', () => {
      assert.strictEqual(body, 'Conflict');
    });

    after((done) => {
      MongoDB.Teams.removeByTeamId(randomTeam.teamid).then(done, done);
    });

  });
  
  describe('GET teams', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let teams: { team: ITeam; member: IUser }[];
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before(async (done) => {
      await MongoDB.Teams.removeAll();
      
      firstUser = await MongoDB.Users.createRandomUser();
      secondUser = await MongoDB.Users.createRandomUser();
      
      let firstTeam = await MongoDB.Teams.createRandomTeam([firstUser._id]);
      let secondTeam = await MongoDB.Teams.createRandomTeam([secondUser._id]);
      
      teams = [
        { team: firstTeam, member: firstUser },
        { team: secondTeam, member: secondUser }
      ].sort((teamA, teamB) => teamA.team.teamid <= teamB.team.teamid ? -1 : 1);
      
      api.get('/teams')
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          responseBody = res.body;
          
          done();
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should return the first team', () => {
      assert.strictEqual(responseBody[0].teamid, teams[0].team.teamid);
      assert.strictEqual(responseBody[0].name, teams[0].team.name);
      assert.strictEqual(responseBody[0].members.length, 1);
      assert.strictEqual(responseBody[0].members[0], teams[0].member.userid);
    });

    it('should return the second team', () => {
      assert.strictEqual(responseBody[1].teamid, teams[1].team.teamid);
      assert.strictEqual(responseBody[1].name, teams[1].team.name);
      assert.strictEqual(responseBody[1].members.length, 1);
      assert.strictEqual(responseBody[1].members[0], teams[1].member.userid);
    });

    after(async (done) => {
      try {
        await MongoDB.Users.removeByUserId(firstUser.userid);
        await MongoDB.Users.removeByUserId(secondUser.userid);
        await MongoDB.Teams.removeByTeamId(teams[0].team.teamid);
        await MongoDB.Teams.removeByTeamId(teams[1].team.teamid);
        done();
      } catch (err) {
        done(err);
      }
    });

  });
  
  describe('GET team by slug (teamid)', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before(async (done) => {
      firstUser = await MongoDB.Users.createRandomUser();
      secondUser = await MongoDB.Users.createRandomUser();
      
      team = await MongoDB.Teams.createRandomTeam([firstUser._id, secondUser._id]);
      
      api.get(`/teams/${team.teamid}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          responseBody = res.body;
          
          done();
        });
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should return the team', () => {
      assert.strictEqual(responseBody.teamid, team.teamid);
      assert.strictEqual(responseBody.name, team.name);
      assert.strictEqual(responseBody.members.length, 2);
      assert.strictEqual(responseBody.members[0], firstUser.userid);
      assert.strictEqual(responseBody.members[1], secondUser.userid);
    });

    after(async (done) => {
      try {
        await MongoDB.Users.removeByUserId(firstUser.userid);
        await MongoDB.Users.removeByUserId(secondUser.userid);
        await MongoDB.Teams.removeByTeamId(team.teamid);
        done();
      } catch (err) {
        done(err);
      }
    });

  });
  
  describe('GET team by slug (teamid) which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async (done) => {
      api.get(`/teams/does not exist`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;
          
          done();
        });
    });

    it('should respond with status code 404 OK', () => {
      assert.strictEqual(statusCode, 404);
    });

    it('should return text/plain content with charset utf-8', () => {
      assert.strictEqual(contentType, 'text/plain; charset=utf-8');
    });

    it('should respond with body text "Not Found"', () => {
      assert.strictEqual(body, 'Not Found');
    });

  });

});