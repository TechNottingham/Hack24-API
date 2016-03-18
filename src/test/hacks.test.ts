"use strict";

import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {IUser} from './models/users';
import {IHack} from './models/hacks';
import {IAttendee} from './models/attendees';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, HacksResource, HackResource, UserResource} from './resources';
import {Random} from './utils/random';
import {PusherListener} from './utils/pusherlistener';

describe('Hacks resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`);
  });

  describe('POST new hack', () => {

    let attendee: IAttendee;
    let hack: IHack;
    let createdHack: IHack;
    let statusCode: number;
    let contentType: string;
    let response: HackResource.TopLevelDocument;
    let pusherListener: PusherListener;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      hack = MongoDB.Hacks.createRandomHack();
      
      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name
          }
        }
      };
      
      pusherListener = await PusherListener.Create(ApiServer.PusherPort);
      
      await api.post('/hacks')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;

          createdHack = await MongoDB.Hacks.findbyHackId(hack.hackid);
          await pusherListener.waitForEvent();
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8');
    });

    it('should return the hack resource object self link', () => {
      assert.strictEqual(response.links.self, `/hacks/${hack.hackid}`);
    });

    it('should return the hack type', () => {
      assert.strictEqual(response.data.type, 'hacks');
    });

    it('should return the hack id', () => {
      assert.strictEqual(response.data.id, hack.hackid);
    });

    it('should return the hack name', () => {
      assert.strictEqual(response.data.attributes.name, hack.name);
    });

    it('should create the hack', () => {
      assert.ok(createdHack, 'Hack not found');
      assert.strictEqual(createdHack.hackid, hack.hackid);
      assert.strictEqual(createdHack.name, hack.name);
    });

    it('should send a hacks_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1);
      
      const event = pusherListener.events[0];
      assert.strictEqual(event.appId, ApiServer.PusherAppId);
      assert.strictEqual(event.contentType, 'application/json');
      assert.strictEqual(event.payload.channels[0], 'api_events');
      assert.strictEqual(event.payload.name, 'hacks_add');
      
      const data = JSON.parse(event.payload.data);
      assert.strictEqual(data.hackid, hack.hackid);
      assert.strictEqual(data.name, hack.name);
    });

    after(async () => {
      await MongoDB.Hacks.removeByHackId(hack.hackid);
      await MongoDB.Hacks.removeByHackId(hack.hackid);
      await pusherListener.close();
    });

  });

  describe('POST hack which already exists', () => {

    let attendee: IAttendee;
    let hack: IHack;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee();
      hack = await MongoDB.Hacks.insertRandomHack();
      
      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name
          }
        }
      };
      
      await api.post('/hacks')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
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

    after(async () => {
      await MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid);
      await MongoDB.Hacks.removeByHackId(hack.hackid);
    });

  });

  describe('POST hack with incorrect authentication', () => {

    let createdHack: IHack;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      const hack = MongoDB.Hacks.createRandomHack();
      
      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name
          }
        }
      };
      
      await api.post('/hacks')
        .auth('not a user', ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
          
          createdHack = await MongoDB.Hacks.findbyHackId(hack.hackid);
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

    it('should not create the hack document', () => {
      assert.strictEqual(createdHack, null);
    });

  });
  
  describe('OPTIONS hacks', () => {

    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: string;

    before(async () => {
      await api.options('/hacks')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.text;
        });
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
  
  describe('GET hacks', () => {

    let firstHack: IHack;
    let secondHack: IHack;
    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: HacksResource.TopLevelDocument;

    before(async () => {
      await MongoDB.Hacks.removeAll();
      
      firstHack = await MongoDB.Hacks.insertRandomHack('A');
      secondHack = await MongoDB.Hacks.insertRandomHack('B');
            
      await api.get('/hacks')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.body;
        });
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

    it('should return the hacks resource object self link', () => {
      assert.strictEqual(response.links.self, '/hacks');
    });

    it('should return the first hack', () => {
      const hackResponse = response.data[0];
      
      assert.strictEqual(hackResponse.type, 'hacks');
      assert.strictEqual(hackResponse.id, firstHack.hackid);
      assert.strictEqual(hackResponse.attributes.name, firstHack.name);
    });

    it('should return the second hack', () => {
      const hackResponse = response.data[1];
      
      assert.strictEqual(hackResponse.type, 'hacks');
      assert.strictEqual(hackResponse.id, secondHack.hackid);
      assert.strictEqual(hackResponse.attributes.name, secondHack.name);
    });

    after(async () => {
      await MongoDB.Hacks.removeByHackId(firstHack.hackid);
      await MongoDB.Hacks.removeByHackId(secondHack.hackid);
    });

  });
  
  describe('OPTIONS hacks by slug (hackid)', () => {

    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: string;

    before(async () => {
      let hack = MongoDB.Hacks.createRandomHack();
      
      await api.options(`/hacks/${hack.hackid}`)
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.text;
        });
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
  
  describe('GET hack by slug (hackid)', () => {

    let hack: IHack;
    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: HackResource.TopLevelDocument;

    before(async () => {
      hack = await MongoDB.Hacks.insertRandomHack();
      
      await api.get(`/hacks/${hack.hackid}`)
        .set('Accept', 'application/json')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.body;
        });
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

    it('should return the hack resource object self link', () => {
      assert.strictEqual(response.links.self, `/hacks/${hack.hackid}`);
    });

    it('should return the hack primary data', () => {
      assert.strictEqual(response.data.type, 'hacks');
      assert.strictEqual(response.data.id, hack.hackid);
      assert.strictEqual(response.data.attributes.name, hack.name);
    });

    after(async () => {
      await MongoDB.Hacks.removeByHackId(hack.hackid);
    });

  });
  
  describe('GET hack by slug (hackid) which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: HackResource.TopLevelDocument;

    before(async () => {
      await api.get(`/hacks/does not exist`)
        .set('Accept', 'application/json')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.body;
        });
    });

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404);
    });

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*');
      assert.strictEqual(accessControlRequestMethod, 'GET');
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept');
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

  describe('GET hacks by filter', () => {

    let firstHack: IHack;
    let secondHack: IHack;
    let thirdHack: IHack;
    let statusCode: number;
    let contentType: string;
    let accessControlAllowOrigin: string;
    let accessControlRequestMethod: string;
    let accessControlRequestHeaders: string;
    let response: HacksResource.TopLevelDocument;

    before(async () => {
      await MongoDB.Hacks.removeAll();
      
      firstHack = await MongoDB.Hacks.insertRandomHack('ABCD');
      secondHack = await MongoDB.Hacks.insertRandomHack('ABEF');
      thirdHack = await MongoDB.Hacks.insertRandomHack('ABCE');
            
      await api.get('/hacks?filter[name]=ABC')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          accessControlAllowOrigin = res.header['access-control-allow-origin'];
          accessControlRequestMethod = res.header['access-control-request-method'];
          accessControlRequestHeaders = res.header['access-control-request-headers'];
          response = res.body;
        });
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

    it('should return the hacks resource object self link', () => {
      assert.strictEqual(response.links.self, '/hacks');
    });

    it('should return two hacks', () => {
      assert.strictEqual(response.data.length, 2);
    });
    
    it('should return the first hack', () => {
      const hackResponse = response.data[0];
      
      assert.strictEqual(hackResponse.type, 'hacks');
      assert.strictEqual(hackResponse.id, firstHack.hackid);
      assert.strictEqual(hackResponse.attributes.name, firstHack.name);
    });

    it('should return the third hack', () => {
      const hackResponse = response.data[1];
      
      assert.strictEqual(hackResponse.type, 'hacks');
      assert.strictEqual(hackResponse.id, thirdHack.hackid);
      assert.strictEqual(hackResponse.attributes.name, thirdHack.name);
    });

    after(async () => {
      await MongoDB.Hacks.removeByHackId(firstHack.hackid),
      await MongoDB.Hacks.removeByHackId(secondHack.hackid),
      await MongoDB.Hacks.removeByHackId(thirdHack.hackid)
    });

  });
  
  describe('DELETE hack', () => {

    let hack: IHack;
    let deletedHack: IHack;
    let statusCode: number;
    let contentType: string;
    let body: string;

    before(async () => {
      hack = await MongoDB.Hacks.insertRandomHack();
      
      await api.delete(`/hacks/${encodeURIComponent(hack.hackid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          body = res.text;

          deletedHack = await MongoDB.Hacks.findbyHackId(hack.hackid);
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
    
    it('should have deleted the attendee', () => {
      assert.strictEqual(deletedHack, null);
    });

    after(async () => {
      await MongoDB.Hacks.removeByHackId(hack.hackid);
    });

  });

  describe('DELETE hack which does not exist', () => {

    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      await api.delete(`/attendees/asdasdasdadasd`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end()
        .then(async (res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
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

  describe('DELETE hack with incorrect auth', () => {

    let attendee: IAttendee;
    let statusCode: number;
    let contentType: string;
    let response: JSONApi.TopLevelDocument;

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee();
      
      await api.delete(`/attendees/${encodeURIComponent(attendee.attendeeid)}`)
        .auth('sack', 'boy')
        .end()
        .then((res) => {
          statusCode = res.status;
          contentType = res.header['content-type'];
          response = res.body;
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
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.');
    });

  });

});