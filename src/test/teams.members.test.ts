"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {ITeam} from './models/teams';
import {IAttendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, TeamMembersRelationship, UserResource} from './resources'

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

    before(async () => {
      firstUser = await MongoDB.Users.insertRandomUser('A');
      secondUser = await MongoDB.Users.insertRandomUser('B');
      thirdUser = await MongoDB.Users.insertRandomUser('C');
      
      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id, thirdUser._id]);
            
      await api.get(`/teams/${team.teamid}/members`)
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
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

    after(async () => {
      await MongoDB.Users.removeByUserId(firstUser.userid);
      await MongoDB.Users.removeByUserId(secondUser.userid);
      await MongoDB.Users.removeByUserId(thirdUser.userid);

      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('DELETE team members', () => {

    let attendee: IAttendee;
    let firstUser: IUser;
    let secondUser: IUser;
    let thirdUser: IUser;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
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

      await api.delete(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
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

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      
      await MongoDB.Users.removeByUserId(firstUser.userid);
      await MongoDB.Users.removeByUserId(secondUser.userid);
      await MongoDB.Users.removeByUserId(thirdUser.userid);

      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe("DELETE team members which don't exist", () => {

    let attendee: IAttendee;
    let user: IUser;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      user = await MongoDB.Users.insertRandomUser();
      team = await MongoDB.Teams.insertRandomTeam([user._id]);
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: user.userid
        },{
          type: 'users',
          id: 'does not exist'
        }]
      }

      await api.delete(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
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

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Users.removeByUserId(user.userid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('POST team members', () => {

    let attendee: IAttendee;
    let user: IUser;
    let newUser: IUser;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      user = await MongoDB.Users.insertRandomUser('A');
      newUser = await MongoDB.Users.insertRandomUser('B');
      
      team = await MongoDB.Teams.insertRandomTeam([user._id]);
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: newUser.userid
        }]
      };

      await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
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

    it('should have added the new user to the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 2);
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true);
      assert.strictEqual(modifiedTeam.members[1].equals(newUser._id), true);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      
      await MongoDB.Users.removeByUserId(user.userid);
      await MongoDB.Users.removeByUserId(newUser.userid);

      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

  describe('POST team members already in a team', () => {

    let attendee: IAttendee;
    let user: IUser;
    let otherUser: IUser;
    let team: ITeam;
    let otherTeam: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      user = await MongoDB.Users.insertRandomUser();
      otherUser = await MongoDB.Users.insertRandomUser();
      
      team = await MongoDB.Teams.insertRandomTeam([user._id]);
      otherTeam = await MongoDB.Teams.insertRandomTeam([otherUser._id]);
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: otherUser.userid
        }]
      };

      await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
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
      assert.strictEqual(response.errors[0].title, 'One or more of the specified users are already in a team.');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1);
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      
      await MongoDB.Users.removeByUserId(user.userid);
      await MongoDB.Users.removeByUserId(otherUser.userid);

      await MongoDB.Teams.removeByTeamId(team.teamid);
      await MongoDB.Teams.removeByTeamId(otherTeam.teamid);
    });

  });

  describe('POST team members which do not exist', () => {

    let attendee: IAttendee;
    let team: ITeam;
    let modifiedTeam: ITeam;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      team = await MongoDB.Teams.insertRandomTeam();
      
      let req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: 'does not exist'
        }]
      };

      await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
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
      assert.strictEqual(response.errors[0].title, 'One or more of the specified users could not be found.');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 0);
    });

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Teams.removeByTeamId(team.teamid);
    });

  });

});