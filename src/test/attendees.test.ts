import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {Attendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, AttendeeResource, AttendeesResource} from '../resources';

describe('Attendees resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`);
  });

  describe('GET attendee by ID', () => {

    let attendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      const res = await api.get(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the attendee resource object self link', () => {
      assert.strictEqual(response.links.self, `/attendees/${encodeURIComponent(attendee.attendeeid)}`);
    });

    it('should return the attendees type', () => {
      assert.strictEqual(response.data.type, 'attendees');
    });

    it('should return the attendee id', () => {
      assert.strictEqual(response.data.id, attendee.attendeeid);
    });

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('GET attendee by ID with incorrect auth', () => {

    let attendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee();

      const res = await api.get(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth('joe', 'blogs')
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('POST new attendee', () => {

    let attendee: Attendee;
    let createdAttendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee();

      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid,
        },
      };

      const res = await api.post('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .send(requestDoc)
        .type('application/vnd.api+json')
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;

      createdAttendee = await MongoDB.Attendees.findbyAttendeeId(attendee.attendeeid);
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the attendee resource object self link', () => {
      assert.strictEqual(response.links.self, `/attendees/${encodeURIComponent(attendee.attendeeid)}`);
    });

    it('should return the attendees type', () => {
      assert.strictEqual(response.data.type, 'attendees');
    });

    it('should return the attendee id', () => {
      assert.strictEqual(response.data.id, attendee.attendeeid);
    });

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('POST new attendee with incorrect auth', () => {

    let attendee: Attendee;
    let createdAttendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee();

      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid,
        },
      };

      const res = await api.post('/attendees')
        .auth('gary', 'adam')
        .send(requestDoc)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;

      createdAttendee = await MongoDB.Attendees.findbyAttendeeId(attendee.attendeeid);
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

    it('should not create the attendee document', () => {
      assert.strictEqual(createdAttendee, null);
    });

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('POST attendee with existing ID', () => {

    let attendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid,
        },
      };

      const res = await api.post('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .type('application/vnd.api+json')
        .send(requestDoc)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
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

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('GET attendees', () => {

    let attendee: Attendee;
    let otherAttendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeesResource.TopLevelDocument;

    before(async () => {
      await MongoDB.Attendees.removeAll();

      attendee = await MongoDB.Attendees.insertRandomAttendee('A');
      otherAttendee = await MongoDB.Attendees.insertRandomAttendee('B');

      const res = await api.get('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
    });

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the attendees resource object self link', () => {
      assert.strictEqual(response.links.self, '/attendees');
    });

    it('should return the first attendee', () => {
      let thisAttendee = response.data[0];
      assert.strictEqual(thisAttendee.type, 'attendees');
      assert.strictEqual(thisAttendee.id, attendee.attendeeid);
      assert.strictEqual(thisAttendee.links.self, `/attendees/${encodeURIComponent(attendee.attendeeid)}`);
    });

    it('should return the second attendee', () => {
      let thisAttendee = response.data[1];
      assert.strictEqual(thisAttendee.type, 'attendees');
      assert.strictEqual(thisAttendee.id, otherAttendee.attendeeid);
      assert.strictEqual(thisAttendee.links.self, `/attendees/${encodeURIComponent(otherAttendee.attendeeid)}`);
    });

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(attendee.attendeeid),
      MongoDB.Users.removeByUserId(otherAttendee.attendeeid),
    ]));

  });

  describe('GET attendees with incorrect auth', () => {

    let statusCode: number;
    let contentType: string;
    let response: AttendeesResource.TopLevelDocument;

    before(async () => {
      const res = await api.get('/attendees')
        .auth('zippy', 'bungle')
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

  });

  describe('DELETE attendee', () => {

    let attendee: Attendee;
    let deletedAttendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();

      const res = await api.delete(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      body = res.text;

      deletedAttendee = await MongoDB.Attendees.findbyAttendeeId(attendee.attendeeid);
    });

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204);
    });

    it('should return no content-type', () => {
      assert.strictEqual(contentType, undefined);
    });

    it('should return no body', () => {
      assert.strictEqual(body, '');
    });

    it('should have deleted the attendee', () => {
      assert.strictEqual(deletedAttendee, null);
    });

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid));

  });

  describe('DELETE attendee which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      const res = await api.delete(`/attendees/asdasdasdadasd`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
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

  describe('DELETE attendee with incorrect auth', () => {

    let attendee: Attendee;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee();

      const res = await api.delete(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth('sack', 'boy')
        .end();

      statusCode = res.status;
      contentType = res.header['content-type'];
      response = res.body;
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

  });

});
