"use strict";

import * as assert from 'assert';
import {ObjectID} from 'mongodb';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam, ITeamResponse} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';

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
    let responseBody: ITeamResponse;

    before((done) => {
      team = {
        name: 'Team_' + Random.str(5),
        members: []
      };

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
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.members.length, 0);
    });

    it('should return the created team', () => {
      assert.strictEqual(responseBody.name, team.name);
      assert.strictEqual(responseBody.members.length, 0);
    });

    after((done) => {
      MongoDB.Teams.removeByName(team.name).then(done).catch(done);
    });

  });

  describe('POST new team with members', () => {

    let user: IUser;
    let expectedUserId: ObjectID;
    let team;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let responseBody: ITeamResponse;

    before((done) => {
      user = {
        userid: 'U' + Random.int(10000, 99999),
        name: 'Name_' + Random.str(5),
        modified: new Date
      };
      
      MongoDB.Users.createUser(user).then((userId) => {
        expectedUserId = userId;
        
        team = {
          name: 'Team_' + Random.str(5),
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

            MongoDB.Teams.findbyName(team.name).then((team) => {
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
      assert.strictEqual(createdTeam.name, team.name);
      assert.strictEqual(createdTeam.members.length, 1);
      assert.ok(createdTeam.members[0].equals(expectedUserId), 'user ObjectIDs do not match');
    });

    it('should return the created team', () => {
      assert.strictEqual(responseBody.name, team.name);
      assert.strictEqual(responseBody.members.length, 1);
      assert.strictEqual(responseBody.members[0], user.userid);
    });

    after((done) => {
      MongoDB.Teams.removeByName(team.name).then(done).catch(done);
    });

  });

});