"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {TeamMembersRelationship, UserResource} from './resources'

describe('Team Members relationship', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('GET team members', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let thirdUser: IUser;
    let team: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamMembersRelationship.TopLevelDocument;

    before(async (done) => {
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      thirdUser = await MongoDB.Users.insertRandomUser('C');
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id, thirdUser._id]);
            
      api.get(`/teams/${team.teamid}/members`)
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

    it('should return the team members self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}/members`);
    });

    it('should return each member', () => {
      assert.strictEqual(response.data[0].type, 'users');
      assert.strictEqual(response.data[0].id, firstUser.userid);
      
      assert.strictEqual(response.data[1].type, 'users');
      assert.strictEqual(response.data[1].id, secondUser.userid);
      
      assert.strictEqual(response.data[2].type, 'users');
      assert.strictEqual(response.data[2].id, thirdUser.userid);
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
  
        MongoDB.Teams.removeByTeamId(team.teamid),
      ]).then(() => done(), done);
    });

  });

  describe('DELETE team members', () => {

    let firstUser: IUser;
    let secondUser: IUser;
    let thirdUser: IUser;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async (done) => {
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      thirdUser = await MongoDB.Users.insertRandomUser('C');
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id, thirdUser._id]);
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: firstUser.userid
        },{
          type: 'users',
          id: thirdUser.userid
        }]
      }

      api.delete(`/teams/${team.teamid}/members`)
        .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
        .send(req)
        .end(async (err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
          
          done();
        });
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should not return a response body', () => {
      assert.strictEqual(body, '');
    });

    it('should have removed the two users from the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1);
      assert.strictEqual(modifiedTeam.members[0].equals(secondUser._id), true);
      
    });

    after((done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(firstUser.userid),
        MongoDB.Users.removeByUserId(secondUser.userid),
        MongoDB.Users.removeByUserId(thirdUser.userid),
  
        MongoDB.Teams.removeByTeamId(team.teamid),
      ]).then(() => done(), done);
    });

  });

  describe("DELETE team members which don't exist", () => {

    let user: IUser;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: TeamMembersRelationship.TopLevelDocument;

    before(async (done) => {
      user = await MongoDB.Users.insertRandomUser();
      team = await MongoDB.Teams.insertRandomTeam([user._id]);
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: 'does not exist'
        }]
      }

      api.delete(`/teams/${team.teamid}/members`)
        .auth(ApiServer.HackbotUsername, ApiServer.HackbotPassword)
        .send(req)
        .end(async (err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
          
          done();
        });
    });

    it('should respond with status code 400 Bad Request', () => {
      assert.strictEqual(statusCode, 400);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return an error with status code 400 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1);
      assert.strictEqual(response.errors[0].status, '400');
      assert.strictEqual(response.errors[0].title, 'Bad request.');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1);
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true);
    });

    after((done) => {
      Promise.all([
        MongoDB.Users.removeByUserId(user.userid),
        MongoDB.Teams.removeByTeamId(team.teamid),
      ]).then(() => done(), done);
    });

  });

});