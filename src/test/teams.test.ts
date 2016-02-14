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

    let team: ITeamRequest;
    let expectedTeamId: string;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before((done) => {
      let randomPart = Random.str(5);
      
      team = {
        name: `Team ${randomPart}`,
        members: []
      };
      
      expectedTeamId = `team-${randomPart}`;

      api.post('/teams')
        .send({ name: team.name })
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          responseBody = res.body;

          MongoDB.Teams.findbyName(team.name).then((team) => {
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
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    it('should return the created team', () => {
      assert.strictEqual(responseBody.teamid, expectedTeamId);
      assert.strictEqual(responseBody.name, team.name);
      assert.strictEqual(responseBody.members.length, 0);
    });

    after((done) => {
      MongoDB.Teams.removeByName(team.name).then(done, done);
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

    before((done) => {
      userId = `U${Random.int(10000, 99999)}`;
      
      let user: IUser = {
        userid: userId,
        name: `Name_${Random.str(5)}`,
        modified: new Date
      };
      
      MongoDB.Users.createUser(user).then((userObjectId) => {
        expectedUserObjectId = userObjectId;
        
        let randomPart = Random.str(5);
        
        teamName = `ú-x.€ ${randomPart}`;
        expectedTeamId = `u-xeuro-${randomPart}`;
        
        let team: ITeamRequest = {
          name: teamName,
          members: [user.userid]
        };
      
        api.post('/teams')
          .send({ name: team.name, members: [user.userid] })
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

    let user: IUser;
    let teamId: string;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before((done) => {
      let randomPart = Random.str(5);
      teamId = `u-xeuro-${randomPart}`;
      
      let teamDoc: ITeam = { 
        teamid: teamId,
        name: `ú-x.€ ${randomPart}`,
        members: []
      };
      
      MongoDB.Teams.createTeam(teamDoc).then((teamObjectId) => {
        api.post('/teams')
          .send({ name: teamDoc.name, members: [] })
          .set('Accept', 'application/json')
          .end((err, res) => {
            if (err) return done(err);

            statusCode = res.status;
            contentType = res.header['content-type'];
            body = res.text;
            
            done();
          });
      }).catch(done);
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
      MongoDB.Teams.removeByTeamId(teamId).then(done, done);
    });

  });
  
  describe('GET teams', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let teams: ITeam[];
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before(async (done) => {
      firstUser = await MongoDB.Users.createRandomUser();
      secondUser = await MongoDB.Users.createRandomUser();
      
      let firstTeam = await MongoDB.Teams.createRandomTeam([firstUser._id]);
      let secondTeam = await MongoDB.Teams.createRandomTeam([secondUser._id]);
      
      teams = [firstTeam, secondTeam].sort((teamA, teamB) => teamA.teamid <= teamB.teamid ? -1 : 1);
      
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
      assert.strictEqual(responseBody[0].teamid, teams[0].teamid);
      assert.strictEqual(responseBody[0].name, teams[0].name);
      assert.strictEqual(responseBody[0].members.length, 1);
      assert.strictEqual(responseBody[0].members[0], firstUser.userid);
    });

    it('should return the second team', () => {
      assert.strictEqual(responseBody[1].teamid, teams[1].teamid);
      assert.strictEqual(responseBody[1].name, teams[1].name);
      assert.strictEqual(responseBody[1].members.length, 1);
      assert.strictEqual(responseBody[1].members[0], secondUser.userid);
    });

    after(async (done) => {
      try {
        await MongoDB.Teams.removeByTeamId(teams[0].teamid);
        await MongoDB.Teams.removeByTeamId(teams[1].teamid);
        done();
      } catch (err) {
        done(err);
      }
    });

  });

});