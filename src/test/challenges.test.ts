import * as assert from 'assert'
import {MongoDB} from './utils/mongodb'
import {Challenge} from './models/challenges'
import {ApiServer} from './utils/apiserver'
import * as request from 'supertest'
import {JSONApi, ChallengesResource, ChallengeResource} from '../resources'

describe('Challenges resource', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('POST new challenge', () => {

    let challenge: Challenge
    let createdChallenge: Challenge
    let statusCode: number
    let contentType: string
    let response: ChallengeResource.TopLevelDocument

    before(async () => {
      challenge = MongoDB.Challenges.createRandomChallenge()

      const challengeRequest: ChallengeResource.TopLevelDocument = {
        data: {
          type: 'challenges',
          attributes: {
            name: challenge.name,
          },
        },
      }

      const res = await api.post('/challenges')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .type('application/vnd.api+json')
        .send(challengeRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdChallenge = await MongoDB.Challenges.findByChallengeId(challenge.challengeid)
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return the challenge resource object self link', () => {
      assert.strictEqual(response.links.self, `/challenges/${challenge.challengeid}`)
    })

    it('should return the challenge type', () => {
      assert.strictEqual(response.data.type, 'challenges')
    })

    it('should return the challenge id', () => {
      assert.strictEqual(response.data.id, challenge.challengeid)
    })

    it('should return the challenge name', () => {
      assert.strictEqual(response.data.attributes.name, challenge.name)
    })

    it('should create the challenge', () => {
      assert.ok(createdChallenge, 'Challenge not found')
      assert.strictEqual(createdChallenge.challengeid, challenge.challengeid)
      assert.strictEqual(createdChallenge.name, challenge.name)
    })

    after(() => MongoDB.Challenges.removeByChallengeId(challenge.challengeid))

  })

  describe('POST challenge which already exists', () => {

    let challenge: Challenge
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      challenge = await MongoDB.Challenges.insertRandomChallenge()

      const challengeRequest: ChallengeResource.TopLevelDocument = {
        data: {
          type: 'challenges',
          attributes: {
            name: challenge.name,
          },
        },
      }

      const res = await api.post('/challenges')
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .type('application/vnd.api+json')
        .send(challengeRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body
    })

    it('should respond with status code 409 Conflict', () => {
      assert.strictEqual(statusCode, 409)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return an error with status code 409 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '409')
      assert.strictEqual(response.errors[0].title, 'Resource ID already exists.')
    })

    after(() => MongoDB.Challenges.removeByChallengeId(challenge.challengeid))

  })

  describe('POST challenge with incorrect authentication', () => {

    let createdChallenge: Challenge
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      const challenge = MongoDB.Challenges.createRandomChallenge()

      const challengeRequest: ChallengeResource.TopLevelDocument = {
        data: {
          type: 'challenges',
          attributes: {
            name: challenge.name,
          },
        },
      }

      const res = await api.post('/challenges')
        .auth('not@user.com', ApiServer.AdminPassword)
        .type('application/vnd.api+json')
        .send(challengeRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdChallenge = await MongoDB.Challenges.findByChallengeId(challenge.challengeid)
    })

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Forbidden" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '403')
      assert.strictEqual(response.errors[0].title, 'Access is forbidden.')
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.')
    })

    it('should not create the challenge document', () => {
      assert.strictEqual(createdChallenge, null)
    })

  })

  describe('OPTIONS challenges', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: string

    before(async () => {
      const res = await api.options('/challenges').end()

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

  describe('GET challenges', () => {

    let firstChallenge: Challenge
    let secondChallenge: Challenge
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: ChallengesResource.TopLevelDocument

    before(async () => {
      await MongoDB.Challenges.removeAll()

      firstChallenge = await MongoDB.Challenges.insertRandomChallenge('A')
      secondChallenge = await MongoDB.Challenges.insertRandomChallenge('B')

      const res = await api.get('/challenges').end()

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

    it('should return the challenges resource object self link', () => {
      assert.strictEqual(response.links.self, '/challenges')
    })

    it('should return the first challenge', () => {
      const challengeResponse = response.data[0]

      assert.strictEqual(challengeResponse.type, 'challenges')
      assert.strictEqual(challengeResponse.id, firstChallenge.challengeid)
      assert.strictEqual(challengeResponse.attributes.name, firstChallenge.name)
    })

    it('should return the second challenge', () => {
      const challengeResponse = response.data[1]

      assert.strictEqual(challengeResponse.type, 'challenges')
      assert.strictEqual(challengeResponse.id, secondChallenge.challengeid)
      assert.strictEqual(challengeResponse.attributes.name, secondChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Challenges.removeByChallengeId(firstChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondChallenge.challengeid),
    ]))

  })

  describe('OPTIONS challenges by slug (challengeid)', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: string

    before(async () => {
      let challenge = MongoDB.Challenges.createRandomChallenge()

      const res = await api.options(`/challenges/${challenge.challengeid}`).end()

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

  describe('GET challenge by slug (challengeid)', () => {

    let challenge: Challenge
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: ChallengeResource.TopLevelDocument

    before(async () => {
      challenge = await MongoDB.Challenges.insertRandomChallenge()

      const res = await api.get(`/challenges/${challenge.challengeid}`)
        .set('Accept', 'application/json')
        .end()

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

    it('should return the challenge resource object self link', () => {
      assert.strictEqual(response.links.self, `/challenges/${challenge.challengeid}`)
    })

    it('should return the challenge primary data', () => {
      assert.strictEqual(response.data.type, 'challenges')
      assert.strictEqual(response.data.id, challenge.challengeid)
      assert.strictEqual(response.data.attributes.name, challenge.name)
    })

    after(() => MongoDB.Challenges.removeByChallengeId(challenge.challengeid))

  })

  describe('GET challenge by slug (challengeid) which does not exist', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: ChallengeResource.TopLevelDocument

    before(async () => {
      const res = await api.get(`/challenges/does not exist`)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlRequestMethod = res.header['access-control-request-method']
      accessControlRequestHeaders = res.header['access-control-request-headers']
      response = res.body
    })

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404)
    })

    it('should allow all origins access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, '*')
      assert.strictEqual(accessControlRequestMethod, 'GET')
      assert.strictEqual(accessControlRequestHeaders, 'Origin, X-Requested-With, Content-Type, Accept')
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Resource not found" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '404')
      assert.strictEqual(response.errors[0].title, 'Resource not found.')
    })
  })

  describe('GET challenges by filter', () => {

    let firstChallenge: Challenge
    let secondChallenge: Challenge
    let thirdChallenge: Challenge
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: ChallengesResource.TopLevelDocument

    before(async () => {
      await MongoDB.Challenges.removeAll()

      firstChallenge = await MongoDB.Challenges.insertRandomChallenge('ABCD')
      secondChallenge = await MongoDB.Challenges.insertRandomChallenge('ABEF')
      thirdChallenge = await MongoDB.Challenges.insertRandomChallenge('ABCE')

      const res = await api.get('/challenges?filter[name]=ABC').end()

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

    it('should return the challenges resource object self link', () => {
      assert.strictEqual(response.links.self, '/challenges')
    })

    it('should return two challenges', () => {
      assert.strictEqual(response.data.length, 2)
    })

    it('should return the first challenge', () => {
      const challengeResponse = response.data[0]

      assert.strictEqual(challengeResponse.type, 'challenges')
      assert.strictEqual(challengeResponse.id, firstChallenge.challengeid)
      assert.strictEqual(challengeResponse.attributes.name, firstChallenge.name)
    })

    it('should return the third challenge', () => {
      const challengeResponse = response.data[1]

      assert.strictEqual(challengeResponse.type, 'challenges')
      assert.strictEqual(challengeResponse.id, thirdChallenge.challengeid)
      assert.strictEqual(challengeResponse.attributes.name, thirdChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Challenges.removeByChallengeId(firstChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(thirdChallenge.challengeid),
    ]))

  })

  describe('DELETE challenge', () => {

    let challenge: Challenge
    let deletedChallenge: Challenge
    let statusCode: number
    let contentType: string
    let body: string

    before(async () => {
      challenge = await MongoDB.Challenges.insertRandomChallenge()

      const res = await api.delete(`/challenges/${encodeURIComponent(challenge.challengeid)}`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      deletedChallenge = await MongoDB.Challenges.findByChallengeId(challenge.challengeid)
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should return no content-type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should return no body', () => {
      assert.strictEqual(body, '')
    })

    it('should have deleted the challenge', () => {
      assert.strictEqual(deletedChallenge, null)
    })

    after(() => MongoDB.Challenges.removeByChallengeId(challenge.challengeid))

  })

  describe('DELETE challenge which does not exist', () => {

    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      const res = await api.delete(`/challenges/rwrerwygdfgd`)
        .auth(ApiServer.AdminUsername, ApiServer.AdminPassword)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body
    })

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Resource not found" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '404')
      assert.strictEqual(response.errors[0].title, 'Resource not found.')
    })

  })

  describe('DELETE challenge with incorrect auth', () => {

    let challenge: Challenge
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      challenge = MongoDB.Challenges.createRandomChallenge()

      const res = await api.delete(`/challenges/${encodeURIComponent(challenge.challengeid)}`)
        .auth('sack', 'boy')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body
    })

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Forbidden" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '403')
      assert.strictEqual(response.errors[0].title, 'Access is forbidden.')
      assert.strictEqual(response.errors[0].detail, 'You are not permitted to perform that action.')
    })

  })

})
