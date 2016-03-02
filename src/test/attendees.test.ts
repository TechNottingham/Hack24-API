"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IAttendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, AttendeeResource, AttendeesResource} from './resources'

describe('Attendees resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('GET attendee by ID', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before(async (done) => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      api.get(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
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

    it('should return the attendee resource object self link', () => {
      assert.strictEqual(response.links.self, `/attendees/${encodeURIComponent(attendee.attendeeid)}`);
    });

    it('should return the attendees type', () => {
      assert.strictEqual(response.data.type, 'attendees');
    });

    it('should return the attendee id', () => {
      assert.strictEqual(response.data.id, attendee.attendeeid);
    });

    after((done) => {
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done, done);
    });

  });

  describe('GET attendee by ID with incorrect auth', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before((done) => {
      attendee = MongoDB.Attendees.createRandomAttendee();
      
      api.get(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth('joe', 'blogs')
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
      assert.strictEqual(response.errors[0].detail, 'Only admin has access to do that.');
    });

    after((done) => {
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done, done);
    });

  });

  describe('POST new attendee', () => {

    let attendee: IAttendee;
    let createdAttendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before((done) => {
      attendee = MongoDB.Attendees.createRandomAttendee();
      
      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid
        }
      };

      api.post('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .send(requestDoc)
        .type('application/vnd.api+json')
        .end(async (err, res) => {
          if (err) return done(err);
          
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdAttendee = await MongoDB.Attendees.findbyAttendeeId(attendee.attendeeid);
          done();
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the attendee resource object self link', () => {
      assert.strictEqual(response.links.self, `/attendees/${encodeURIComponent( attendee.attendeeid)}`);
    });

    it('should return the attendees type', () => {
      assert.strictEqual(response.data.type, 'attendees');
    });

    it('should return the attendee id', () => {
      assert.strictEqual(response.data.id, attendee.attendeeid);
    });

    after((done) => {
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done).catch(done);
    });

  });

  describe('POST new attendee with incorrect auth', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeeResource.TopLevelDocument;

    before((done) => {
       attendee = MongoDB.Attendees.createRandomAttendee();
      
      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid
        }
      };

      api.post('/attendees')
        .auth('gary', 'adam')
        .send(requestDoc)
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
      assert.strictEqual(response.errors[0].detail, 'Only admin has access to do that.');
    });

    it('should not create the attendee document', (done) => {
      MongoDB.Attendees.findbyAttendeeId(attendee.attendeeid).then((attendee) => {
        done(attendee ? new Error('Attendee was created') : null);
      }).catch(done);
    });

    after((done) => {
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done, done);
    });

  });

  describe('POST attendee with existing ID', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async (done) => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      let requestDoc: AttendeeResource.TopLevelDocument = {
        data: {
          type: 'attendees',
          id: attendee.attendeeid
        }
      };

      api.post('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .type('application/vnd.api+json')
        .send(requestDoc)
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
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done, done);
    });

  });
  
  describe('GET attendees', () => {

    let attendee: IAttendee;
    let otherAttendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: AttendeesResource.TopLevelDocument;

    before(async (done) => {
      await MongoDB.Attendees.removeAll();
      
      attendee = await MongoDB.Attendees.insertRandomAttendee('A');
      otherAttendee = await MongoDB.Attendees.insertRandomAttendee('B');
      
      api.get('/attendees')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
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

    it('should return the attendees resource object self link', () => {
      assert.strictEqual(response.links.self, '/attendees');
    });

    it('should return the first attendee', () => {
      let thisAttendee = response.data[0];
      assert.strictEqual(thisAttendee.type, 'attendees');
      assert.strictEqual(thisAttendee.id, attendee.attendeeid);
    });

    it('should return the second attendee', () => {
      let thisAttendee = response.data[1];
      assert.strictEqual(thisAttendee.type, 'attendees');
      assert.strictEqual(thisAttendee.id, otherAttendee.attendeeid);
    });
    
    after((done) => {
      Promise.all([
        MongoDB.Teams.removeByTeamId(attendee.attendeeid),
        MongoDB.Users.removeByUserId(otherAttendee.attendeeid)
      ]).then(() => done(), done);
    });

  });
  
  describe('GET attendees with incorrect auth', () => {

    let statusCode: number;
    let contentType: string;
    let response: AttendeesResource.TopLevelDocument;

    before(async (done) => {
      api.get('/attendees')
        .auth('zippy', 'bungle')
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
      assert.strictEqual(response.errors[0].detail, 'Only admin has access to do that.');
    });

  });

  describe('DELETE attendee', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async (done) => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      
      api.delete(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          done();
        });
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

    after((done) => {
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid).then(done, done);
    });

  });

  describe('DELETE attendee with incorrect auth', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async (done) => {
      attendee = MongoDB.Attendees.createRandomAttendee();
      
      api.delete(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth('sack', 'boy')
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
      assert.strictEqual(response.errors[0].detail, 'Only admin has access to do that.');
    });

  });
  
});