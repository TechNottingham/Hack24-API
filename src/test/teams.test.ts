"use strict";

import * as assert from 'assert';
import {ObjectID} from 'mongodb';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeamRequest, ITeam, ITeamResponse, ITeamsResponse} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';
import {JSONApi, TeamsResource} from './resources'

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new team', () => {

    let team: ITeam;
    let expectedTeamId: string;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamsResource.TopLevelDocument;

    before((done) => {
      team = MongoDB.Teams.createRandomTeam();
      
      let teamRequest: ITeamRequest = {
        name: team.name,
        members: []
      };
      
      api.post('/teams')
        .send(teamRequest)
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          MongoDB.Teams.findbyTeamId(expectedTeamId).then((team) => {
            createdTeam = team;
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

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${team.userid}`);
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

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should create the team with the expected name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.teamid, expectedTeamId);
      assert.strictEqual(createdTeam.name, teamName);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    it('should return the created team', () => {
      assert.strictEqual(response.teamid, expectedTeamId);
      assert.strictEqual(response.name, teamName);
      assert.strictEqual(response.members.length, 0);
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
      
      expectedUserObjectId = await MongoDB.Users.insertUser(user);
        
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
      randomTeam = await MongoDB.Teams.insertRandomTeam();
      
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
    let thirdUser: IUser;
    let fourthUser: IUser;
    let firstTeam: ITeam;
    let secondTeam: ITeam;
    let thirdTeam: ITeam;
    let fourthTeam: ITeam;
    let teamOrder: { team: ITeam; member: IUser }[];
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamsResponse;

    before(async (done) => {
      await MongoDB.Teams.removeAll();
      
      firstUser = await MongoDB.Users.insertRandomUser();
      secondUser = await MongoDB.Users.insertRandomUser();
      thirdUser = await MongoDB.Users.insertRandomUser();
      fourthUser = await MongoDB.Users.insertRandomUser();
      
      firstTeam = await MongoDB.Teams.insertRandomTeam([firstUser._id]);
      secondTeam = await MongoDB.Teams.insertRandomTeam([secondUser._id]);
      thirdTeam = await MongoDB.Teams.insertRandomTeam([thirdUser._id]);
      fourthTeam = await MongoDB.Teams.insertRandomTeam([fourthUser._id]);
      
      teamOrder = [
        { team: firstTeam, member: firstUser },
        { team: secondTeam, member: secondUser },
        { team: thirdTeam, member: thirdUser },
        { team: fourthTeam, member: fourthUser }
      ].sort((teamA, teamB) => teamA.team.teamid <= teamB.team.teamid ? -1 : 1);
      
      api.get('/teams')
        .query({ startindex: 1, count: 2 })
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

    it('should return the expected count and start index', () => {
      assert.strictEqual(responseBody.count, 2);
      assert.strictEqual(responseBody.totalcount, 4);
      assert.strictEqual(responseBody.startindex, 1);
    });

    it('should return two teams', () => {
      assert.strictEqual(responseBody.teams.length, 2);
    });

    it('should return the second team', () => {
      assert.strictEqual(responseBody.teams[0].teamid, teamOrder[1].team.teamid);
      assert.strictEqual(responseBody.teams[0].name, teamOrder[1].team.name);
      assert.strictEqual(responseBody.teams[0].members.length, 1);
      assert.strictEqual(responseBody.teams[0].members[0], teamOrder[1].member.userid);
    });

    it('should return the third team', () => {
      assert.strictEqual(responseBody.teams[1].teamid, teamOrder[2].team.teamid);
      assert.strictEqual(responseBody.teams[1].name, teamOrder[2].team.name);
      assert.strictEqual(responseBody.teams[1].members.length, 1);
      assert.strictEqual(responseBody.teams[1].members[0], teamOrder[2].member.userid);
    });

    after(async (done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(firstUser.userid),
        MongoDB.Users.removeByUserId(secondUser.userid),
        MongoDB.Users.removeByUserId(thirdUser.userid),
        MongoDB.Users.removeByUserId(fourthUser.userid),
  
        MongoDB.Teams.removeByTeamId(firstTeam.teamid),
        MongoDB.Teams.removeByTeamId(secondTeam.teamid),
        MongoDB.Teams.removeByTeamId(thirdTeam.teamid),
        MongoDB.Teams.removeByTeamId(fourthTeam.teamid)
      ]).then(() => done(), done);
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
      firstUser = await MongoDB.Users.insertRandomUser();
      secondUser = await MongoDB.Users.insertRandomUser();
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id]);
      
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