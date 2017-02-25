import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {Team} from './models/teams';
import {Hack} from './models/hacks';
import {Attendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, TeamEntriesRelationship, HackResource} from '../resources';
import {PusherListener} from './utils/pusherlistener';

describe('Team Entries relationship', () => {

  let api: request.SuperTest<request.Test>;

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`);
  });

  describe('OPTIONS team entries', () => {

    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: string;

    before(async () => {
      let team = MongoDB.Teams.createRandomTeam();

      const res = await api.options(`/teams/${team.teamid}/entries`).end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      accessControlAllowOrigin = res.header['access-control-allow-origin'];
      accessControlRequestMethod = res.header['access-control-request-method'];
      accessControlRequestHeaders = res.header['access-control-request-headers'];
      response = res.text;
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should return no content type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*');
      assert.strictEqual(accessControlRequestMethod, 'GET');
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept');
    });

    it('should return no body', () => {
      assert.strictEqual(response, '');
    });

  });

  describe('GET team entries', () => {

    let firstHack: Hack;
    let secondHack: Hack;
    let thirdHack: Hack;
    let team: Team;
    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: TeamEntriesRelationship.TopLevelDocument;

    before(async () => {
      firstHack = await MongoDB.Hacks.insertRandomHack('A');
      secondHack = await MongoDB.Hacks.insertRandomHack('B');
      thirdHack = await MongoDB.Hacks.insertRandomHack('C');

      team = MongoDB.Teams.createRandomTeam();
      team.entries = [firstHack._id, secondHack._id, thirdHack._id];
      await MongoDB.Teams.insertTeam(team);

      const res = await api.get(`/teams/${team.teamid}/entries`).end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      accessControlAllowOrigin = res.header['access-control-allow-origin'];
      accessControlRequestMethod = res.header['access-control-request-method'];
      accessControlRequestHeaders = res.header['access-control-request-headers'];
      response = res.body;
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*');
      assert.strictEqual(accessControlRequestMethod, 'GET');
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept');
    });

    it('should return the team entries self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}/entries`);
    });

    it('should return each entry', () => {
      assert.strictEqual(response.data[0].type, 'hacks');
      assert.strictEqual(response.data[0].id, firstHack.hackid);

      assert.strictEqual(response.data[1].type, 'hacks');
      assert.strictEqual(response.data[1].id, secondHack.hackid);

      assert.strictEqual(response.data[2].type, 'hacks');
      assert.strictEqual(response.data[2].id, thirdHack.hackid);
    });

    it('should include each expected hack', () => {
      const hacks = <HackResource.ResourceObject[]> response.included;

      assert.strictEqual(hacks[0].links.self, `/hacks/${firstHack.hackid}`);
      assert.strictEqual(hacks[0].id, firstHack.hackid);
      assert.strictEqual(hacks[0].attributes.name, firstHack.name);

      assert.strictEqual(hacks[1].links.self, `/hacks/${secondHack.hackid}`);
      assert.strictEqual(hacks[1].id, secondHack.hackid);
      assert.strictEqual(hacks[1].attributes.name, secondHack.name);

      assert.strictEqual(hacks[2].links.self, `/hacks/${thirdHack.hackid}`);
      assert.strictEqual(hacks[2].id, thirdHack.hackid);
      assert.strictEqual(hacks[2].attributes.name, thirdHack.name);
    });

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Hacks.removeByHackId(thirdHack.hackid),

      MongoDB.Teams.removeByTeamId(team.teamid),
    ]));

  });

  describe('DELETE multiple team entries', () => {

    let attendee: Attendee;
    let firstHack: Hack;
    let secondHack: Hack;
    let thirdHack: Hack;
    let team: Team;
    let modifiedTeam: Team;
    let statusCode: number;
    let contentType: string;
    let body: string;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      firstHack = await MongoDB.Hacks.insertRandomHack('A');
      secondHack = await MongoDB.Hacks.insertRandomHack('B');
      thirdHack = await MongoDB.Hacks.insertRandomHack('C');

      team = MongoDB.Teams.createRandomTeam();
      team.entries = [firstHack._id, secondHack._id, thirdHack._id];
      await MongoDB.Teams.insertTeam(team);

      let req: TeamEntriesRelationship.TopLevelDocument = {
        data: [{
          type: 'hacks',
          id: firstHack.hackid,
        }, {
            type: 'hacks',
            id: thirdHack.hackid,
          }],
      };

      pusherListener = await PusherListener.Create(ApiServer.PusherPort);

      const res = await api.delete(`/teams/${team.teamid}/entries`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      body = res.text;

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
      await pusherListener.waitForEvents(2);
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

    it('should have removed the two hacks from the team', () => {
      assert.strictEqual(modifiedTeam.entries.length, 1);
      assert.strictEqual(modifiedTeam.entries[0].equals(secondHack._id), true);
    });

    it('should send two teams_update_entries_delete events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2);
    });

    it('should send a teams_update_entries_delete event for the first team entry', () => {
      const event = pusherListener.events[0];
      assert.strictEqual(event.appId, ApiServer.PusherAppId);
      assert.strictEqual(event.contentType, 'application/json');
      assert.strictEqual(event.payload.channels[0], 'api_events');
      assert.strictEqual(event.payload.name, 'teams_update_entries_delete');

      const data = JSON.parse(event.payload.data);
      assert.strictEqual(data.teamid, team.teamid);
      assert.strictEqual(data.name, team.name);
      assert.strictEqual(data.entry.hackid, firstHack.hackid);
      assert.strictEqual(data.entry.name, firstHack.name);
    });

    it('should send a teams_update_entries_delete event for the third team entry', () => {
      const event = pusherListener.events[1];
      assert.strictEqual(event.appId, ApiServer.PusherAppId);
      assert.strictEqual(event.contentType, 'application/json');
      assert.strictEqual(event.payload.channels[0], 'api_events');
      assert.strictEqual(event.payload.name, 'teams_update_entries_delete');

      const data = JSON.parse(event.payload.data);
      assert.strictEqual(data.teamid, team.teamid);
      assert.strictEqual(data.name, team.name);
      assert.strictEqual(data.entry.hackid, thirdHack.hackid);
      assert.strictEqual(data.entry.name, thirdHack.name);
    });

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Hacks.removeByHackId(thirdHack.hackid),

      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]));

  });

  describe("DELETE team entries which don't exist", () => {

    let attendee: Attendee;
    let hack: Hack;
    let team: Team;
    let modifiedTeam: Team;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      hack = await MongoDB.Hacks.insertRandomHack();
      team = MongoDB.Teams.createRandomTeam();
      team.entries = [hack._id];
      await MongoDB.Teams.insertTeam(team);

      let req: TeamEntriesRelationship.TopLevelDocument = {
        data: [{
          type: 'hacks',
          id: hack.hackid,
        }, {
            type: 'hacks',
            id: 'does not exist',
          }],
      };

      pusherListener = await PusherListener.Create(ApiServer.PusherPort);

      const res = await api.delete(`/teams/${team.teamid}/entries`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
      await pusherListener.waitForEvent();
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
      assert.strictEqual(modifiedTeam.entries.length, 1);
      assert.strictEqual(modifiedTeam.entries[0].equals(hack._id), true);
    });

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0);
    });

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]));

  });

  describe('POST team entries', () => {

    let attendee: Attendee;
    let hack: Hack;
    let firstNewHack: Hack;
    let secondNewHack: Hack;
    let team: Team;
    let modifiedTeam: Team;
    let statusCode: number;
    let contentType: string;
    let body: string;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      hack = await MongoDB.Hacks.insertRandomHack('A');
      firstNewHack = await MongoDB.Hacks.insertRandomHack('B');
      secondNewHack = await MongoDB.Hacks.insertRandomHack('C');

      team = MongoDB.Teams.createRandomTeam();
      team.entries = [hack._id];
      await MongoDB.Teams.insertTeam(team);

      let req: TeamEntriesRelationship.TopLevelDocument = {
        data: [{
          type: 'hacks',
          id: firstNewHack.hackid,
        }, {
            type: 'hacks',
            id: secondNewHack.hackid,
          }],
      };

      pusherListener = await PusherListener.Create(ApiServer.PusherPort);

      const res = await api.post(`/teams/${team.teamid}/entries`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      body = res.text;

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
      await pusherListener.waitForEvents(2);
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

    it('should have added the new hack to the team', () => {
      assert.strictEqual(modifiedTeam.entries.length, 3);
      assert.strictEqual(modifiedTeam.entries[0].equals(hack._id), true);
      assert.strictEqual(modifiedTeam.entries[1].equals(firstNewHack._id), true);
      assert.strictEqual(modifiedTeam.entries[2].equals(secondNewHack._id), true);
    });

    it('should send two teams_update_entries_add events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2);
    });

    it('should send a teams_update_entries_add event for the first new team entry', () => {
      const event = pusherListener.events[0];
      assert.strictEqual(event.appId, ApiServer.PusherAppId);
      assert.strictEqual(event.contentType, 'application/json');
      assert.strictEqual(event.payload.channels[0], 'api_events');
      assert.strictEqual(event.payload.name, 'teams_update_entries_add');

      const data = JSON.parse(event.payload.data);
      assert.strictEqual(data.teamid, team.teamid);
      assert.strictEqual(data.name, team.name);
      assert.strictEqual(data.entry.hackid, firstNewHack.hackid);
      assert.strictEqual(data.entry.name, firstNewHack.name);
    });

    it('should send a teams_update_entries_add event for the second new team entry', () => {
      const event = pusherListener.events[1];
      assert.strictEqual(event.appId, ApiServer.PusherAppId);
      assert.strictEqual(event.contentType, 'application/json');
      assert.strictEqual(event.payload.channels[0], 'api_events');
      assert.strictEqual(event.payload.name, 'teams_update_entries_add');

      const data = JSON.parse(event.payload.data);
      assert.strictEqual(data.teamid, team.teamid);
      assert.strictEqual(data.name, team.name);
      assert.strictEqual(data.entry.hackid, secondNewHack.hackid);
      assert.strictEqual(data.entry.name, secondNewHack.name);
    });

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Hacks.removeByHackId(firstNewHack.hackid),
      MongoDB.Hacks.removeByHackId(secondNewHack.hackid),

      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]));

  });

  describe('POST team entries already in a team', () => {

    let attendee: Attendee;
    let hack: Hack;
    let otherHack: Hack;
    let team: Team;
    let otherTeam: Team;
    let modifiedTeam: Team;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      hack = await MongoDB.Hacks.insertRandomHack();
      otherHack = await MongoDB.Hacks.insertRandomHack();

      team = await MongoDB.Teams.createRandomTeam();
      team.entries = [hack._id];
      await MongoDB.Teams.insertTeam(team);
      otherTeam = await MongoDB.Teams.createRandomTeam();
      otherTeam.entries = [otherHack._id];
      await MongoDB.Teams.insertTeam(otherTeam);

      let req: TeamEntriesRelationship.TopLevelDocument = {
        data: [{
          type: 'hacks',
          id: otherHack.hackid,
        }],
      };

      pusherListener = await PusherListener.Create(ApiServer.PusherPort);

      const res = await api.post(`/teams/${team.teamid}/entries`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
      await pusherListener.waitForEvent();
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
      assert.strictEqual(response.errors[0].title, 'One or more of the specified hacks are already in a team.');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.entries.length, 1);
      assert.strictEqual(modifiedTeam.entries[0].equals(hack._id), true);
    });

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0);
    });

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Hacks.removeByHackId(otherHack.hackid),

      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Teams.removeByTeamId(otherTeam.teamid),

      pusherListener.close(),
    ]));

  });

  describe('POST team entries which do not exist', () => {

    let attendee: Attendee;
    let team: Team;
    let modifiedTeam: Team;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      team = await MongoDB.Teams.insertRandomTeam();

      let req: TeamEntriesRelationship.TopLevelDocument = {
        data: [{
          type: 'hacks',
          id: 'does not exist',
        }],
      };

      pusherListener = await PusherListener.Create(ApiServer.PusherPort);

      const res = await api.post(`/teams/${team.teamid}/entries`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid);
      await pusherListener.waitForEvent();
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
      assert.strictEqual(response.errors[0].title, 'One or more of the specified hacks could not be found.');
    });

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.entries.length, 0);
    });

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0);
    });

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]));

  });

});
