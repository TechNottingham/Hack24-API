import * as assert from 'assert'
import {ApiServer} from './utils/apiserver'
import * as request from 'supertest'
import {Root} from '../resources'

describe('API Root', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('GET root document', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: Root.TopLevelDocument

    before(async () => {
      const res = await api.get('/').end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlRequestMethod = res.header['access-control-request-method']
      accessControlRequestHeaders = res.header['access-control-request-headers']
      response = res.body
    })

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*')
      assert.strictEqual(accessControlRequestMethod, 'GET')
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept')
    })

    it('should return jsonapi version 1.0', () => {
      assert.strictEqual(response.jsonapi.version, '1.0')
    })

    it('should return the root document self link', () => {
      assert.strictEqual(response.links.self, '/')
    })

    it('should return the teams link', () => {
      assert.strictEqual(response.links.teams.href, '/teams')
    })

    it('should return the users link', () => {
      assert.strictEqual(response.links.users.href, '/users')
    })

    it('should return the attendees link', () => {
      assert.strictEqual(response.links.attendees.href, '/attendees')
    })

  })

  describe('OPTIONS root document', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: string

    before(async () => {
      const res = await api.options('/').end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlRequestMethod = res.header['access-control-request-method']
      accessControlRequestHeaders = res.header['access-control-request-headers']
      response = res.text
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should return no content type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*')
      assert.strictEqual(accessControlRequestMethod, 'GET')
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept')
    })

    it('should return no body', () => {
      assert.strictEqual(response, '')
    })

  })

})
