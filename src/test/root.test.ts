"use strict";

import * as assert from 'assert';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {JSONApi, Root} from './resources'

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('GET root document', () => {

    let statusCode: number;
    let contentType: string;
    let response: Root.TopLevelDocument;

    before((done) => {
      
      api.get('/')
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

    it('should return jsonapi version 1.0', () => {
      assert.strictEqual(response.jsonapi.version, '1.0');
    });

    it('should return the root document self link', () => {
      assert.strictEqual(response.links.self, '/');
    });

    it('should return the teams link', () => {
      assert.strictEqual(response.links.teams.href, '/teams');
    });

    it('should return the users link', () => {
      assert.strictEqual(response.links.users.href, '/users');
    });
    
  });

});