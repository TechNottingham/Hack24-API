import * as assert from 'assert'
import { MongoDB } from './utils/mongodb'
import { Team } from './models/teams'
import { Hack } from './models/hacks'
import { Attendee } from './models/attendees'
import { ApiServer } from './utils/apiserver'
import * as request from 'supertest'
import { JSONApi, HacksResource, HackResource } from '../resources'
import { PusherListener } from './utils/pusherlistener'
import { SlackApi } from './utils/slackapi'
import { Random } from './utils/random'

describe('Hacks resource', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('POST new hack', () => {

    let attendee: Attendee
    let hack: Hack
    let createdHack: Hack
    let statusCode: number
    let contentType: string
    let response: HackResource.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      hack = MongoDB.Hacks.createRandomHack()

      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/hacks')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdHack = await MongoDB.Hacks.findByHackId(hack.hackid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return the hack resource object self link', () => {
      assert.strictEqual(response.links.self, `/hacks/${hack.hackid}`)
    })

    it('should return the hack type', () => {
      assert.strictEqual(response.data.type, 'hacks')
    })

    it('should return the hack id', () => {
      assert.strictEqual(response.data.id, hack.hackid)
    })

    it('should return the hack name', () => {
      assert.strictEqual(response.data.attributes.name, hack.name)
    })

    it('should create the hack', () => {
      assert.ok(createdHack, 'Hack not found')
      assert.strictEqual(createdHack.hackid, hack.hackid)
      assert.strictEqual(createdHack.name, hack.name)
    })

    it('should send a hacks_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.hackid === hack.hackid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'hacks_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, hack.name)
    })

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Hacks.removeByHackId(hack.hackid),

      pusherListener.close(),
    ]))

  })

  describe('POST hack which already exists', () => {

    let attendee: Attendee
    let hack: Hack
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      hack = await MongoDB.Hacks.insertRandomHack()

      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name,
          },
        },
      }

      const res = await api.post('/hacks')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
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
      assert.strictEqual(response.errors[0].title, 'Conflict')
      assert.strictEqual(response.errors[0].detail, 'Hack already exists')
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Hacks.removeByHackId(hack.hackid),
    ]))

  })

  describe('POST hack with incorrect authentication', () => {

    let createdHack: Hack
    let statusCode: number
    let contentType: string
    let authenticateHeader: string
    let response: JSONApi.TopLevelDocument
    let slackApi: SlackApi
    let pusherListener: PusherListener

    before(async () => {
      const hack = MongoDB.Hacks.createRandomHack()

      const hackRequest: HackResource.TopLevelDocument = {
        data: {
          type: 'hacks',
          attributes: {
            name: hack.name,
          },
        },
      }

      slackApi = await SlackApi.Create(ApiServer.SlackApiPort, ApiServer.SlackApiBasePath)
      slackApi.UsersList = {
        ok: false,
        error: 'user_not_found',
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/hacks')
        .auth('U12345678', ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(hackRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      authenticateHeader = res.header['www-authenticate']
      response = res.body

      createdHack = await MongoDB.Hacks.findByHackId(hack.hackid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 401 Unauthorised', () => {
      assert.strictEqual(statusCode, 401)
    })

    it('should respond with WWW-Authenticate header for basic realm "Attendee access"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="Attendee access", error="Bad username or password"')
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Unauthorized" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '401')
      assert.strictEqual(response.errors[0].title, 'Unauthorized')
      assert.strictEqual(response.errors[0].detail, 'Bad username or password')
    })

    it('should not create the hack document', () => {
      assert.strictEqual(createdHack, null)
    })

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      slackApi.close(),
      pusherListener.close(),
    ]))
  })

  describe('OPTIONS hacks', () => {

    let origin: string
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlAllowMethods: string
    let accessControlAllowHeaders: string
    let accessControlExposeHeaders: string
    let accessControlMaxAge: string
    let response: string

    before(async () => {
      origin = Random.str()

      const res = await api.options('/hacks')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlAllowMethods = res.header['access-control-allow-methods']
      accessControlAllowHeaders = res.header['access-control-allow-headers']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      accessControlMaxAge = res.header['access-control-max-age']
      response = res.text
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should return no content type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.strictEqual(accessControlAllowMethods, 'GET')
      assert.deepEqual(accessControlAllowHeaders.split(','), ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'])
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
      assert.strictEqual(accessControlMaxAge, '86400')
    })

    it('should return no body', () => {
      assert.strictEqual(response, '')
    })

  })

  describe('GET hacks', () => {

    let origin: string
    let firstHack: Hack
    let secondHack: Hack
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: HacksResource.TopLevelDocument

    before(async () => {
      await MongoDB.Hacks.removeAll()

      origin = Random.str()

      firstHack = await MongoDB.Hacks.insertRandomHack('A')
      secondHack = await MongoDB.Hacks.insertRandomHack('B')

      const res = await api.get('/hacks')
        .set('Origin', origin)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
    })

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
    })

    it('should return the hacks resource object self link', () => {
      assert.strictEqual(response.links.self, '/hacks')
    })

    it('should return the first hack', () => {
      const hackResponse = response.data[0]

      assert.strictEqual(hackResponse.type, 'hacks')
      assert.strictEqual(hackResponse.id, firstHack.hackid)
      assert.strictEqual(hackResponse.attributes.name, firstHack.name)
    })

    it('should return the second hack', () => {
      const hackResponse = response.data[1]

      assert.strictEqual(hackResponse.type, 'hacks')
      assert.strictEqual(hackResponse.id, secondHack.hackid)
      assert.strictEqual(hackResponse.attributes.name, secondHack.name)
    })

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
    ]))

  })

  describe('OPTIONS hacks by slug (hackid)', () => {

    let origin: string
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlAllowMethods: string
    let accessControlAllowHeaders: string
    let accessControlExposeHeaders: string
    let accessControlMaxAge: string
    let response: string

    before(async () => {
      origin = Random.str()

      const hack = MongoDB.Hacks.createRandomHack()

      const res = await api.options(`/hacks/${hack.hackid}`)
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlAllowMethods = res.header['access-control-allow-methods']
      accessControlAllowHeaders = res.header['access-control-allow-headers']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      accessControlMaxAge = res.header['access-control-max-age']
      response = res.text
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should return no content type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.strictEqual(accessControlAllowMethods, 'GET')
      assert.deepEqual(accessControlAllowHeaders.split(','), ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'])
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
      assert.strictEqual(accessControlMaxAge, '86400')
    })

    it('should return no body', () => {
      assert.strictEqual(response, '')
    })

  })

  describe('GET hack by slug (hackid)', () => {

    let origin: string
    let hack: Hack
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: HackResource.TopLevelDocument

    before(async () => {
      origin = Random.str()

      hack = await MongoDB.Hacks.insertRandomHack()

      const res = await api.get(`/hacks/${hack.hackid}`)
        .set('Origin', origin)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
    })

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
    })

    it('should return the hack resource object self link', () => {
      assert.strictEqual(response.links.self, `/hacks/${hack.hackid}`)
    })

    it('should return the hack primary data', () => {
      assert.strictEqual(response.data.type, 'hacks')
      assert.strictEqual(response.data.id, hack.hackid)
      assert.strictEqual(response.data.attributes.name, hack.name)
    })

    after(() => MongoDB.Hacks.removeByHackId(hack.hackid))

  })

  describe('GET hack by slug (hackid) which does not exist', () => {

    let origin: string
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: HackResource.TopLevelDocument

    before(async () => {
      origin = Random.str()

      const res = await api.get(`/hacks/does not exist`)
        .set('Origin', origin)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
    })

    it('should respond with status code 404 Not Found', () => {
      assert.strictEqual(statusCode, 404)
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Resource not found" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '404')
      assert.strictEqual(response.errors[0].title, 'Not Found')
      assert.strictEqual(response.errors[0].detail, 'Hack not found')
    })
  })

  describe('GET hacks by filter', () => {

    let origin: string
    let firstHack: Hack
    let secondHack: Hack
    let thirdHack: Hack
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: HacksResource.TopLevelDocument

    before(async () => {
      await MongoDB.Hacks.removeAll()

      origin = Random.str()

      firstHack = await MongoDB.Hacks.insertRandomHack('ABCD')
      secondHack = await MongoDB.Hacks.insertRandomHack('ABEF')
      thirdHack = await MongoDB.Hacks.insertRandomHack('ABCE')

      const res = await api.get('/hacks?filter[name]=ABC')
        .set('Origin', origin)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
    })

    it('should respond with status code 200 OK', () => {
      assert.strictEqual(statusCode, 200)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
    })

    it('should return the hacks resource object self link', () => {
      assert.strictEqual(response.links.self, '/hacks')
    })

    it('should return two hacks', () => {
      assert.strictEqual(response.data.length, 2)
    })

    it('should return the first hack', () => {
      const hackResponse = response.data[0]

      assert.strictEqual(hackResponse.type, 'hacks')
      assert.strictEqual(hackResponse.id, firstHack.hackid)
      assert.strictEqual(hackResponse.attributes.name, firstHack.name)
    })

    it('should return the third hack', () => {
      const hackResponse = response.data[1]

      assert.strictEqual(hackResponse.type, 'hacks')
      assert.strictEqual(hackResponse.id, thirdHack.hackid)
      assert.strictEqual(hackResponse.attributes.name, thirdHack.name)
    })

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Hacks.removeByHackId(thirdHack.hackid),
    ]))

  })

  describe('DELETE hack', () => {

    let attendee: Attendee
    let hack: Hack
    let deletedHack: Hack
    let statusCode: number
    let contentType: string
    let body: string

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      hack = await MongoDB.Hacks.insertRandomHack()

      const res = await api.delete(`/hacks/${encodeURIComponent(hack.hackid)}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      deletedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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

    it('should have deleted the hack', () => {
      assert.strictEqual(deletedHack, null)
    })

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
    ]))

  })

  describe('DELETE hack entered into a team', () => {

    let attendee: Attendee
    let hack: Hack
    let team: Team
    let deletedHack: Hack
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      hack = await MongoDB.Hacks.insertRandomHack()
      team = MongoDB.Teams.createRandomTeam()
      team.entries = [hack._id]
      await MongoDB.Teams.insertTeam(team)

      const res = await api.delete(`/hacks/${encodeURIComponent(hack.hackid)}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      deletedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
    })

    it('should respond with status code 400 Bad Request', () => {
      assert.strictEqual(statusCode, 400)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Hack is entered into a team" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '400')
      assert.strictEqual(response.errors[0].title, 'Bad Request')
      assert.strictEqual(response.errors[0].detail, 'Hack is entered into a team')
    })

    it('should not delete the hack', () => {
      assert.strictEqual(deletedHack.hackid, hack.hackid)
    })

    after(() => Promise.all([
      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
    ]))

  })

  describe('DELETE hack which does not exist', () => {

    let attendee: Attendee
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      const res = await api.delete(`/hacks/rwrerwygdfgd`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
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

    it('should respond with the expected "Hack not found" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '404')
      assert.strictEqual(response.errors[0].title, 'Not Found')
      assert.strictEqual(response.errors[0].detail, 'Hack not found')
    })

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid))

  })

  describe('DELETE hack with incorrect auth', () => {

    let hack: Hack
    let deletedHack: Hack
    let statusCode: number
    let contentType: string
    let authenticateHeader: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      hack = await MongoDB.Hacks.insertRandomHack()

      const res = await api.delete(`/hacks/${encodeURIComponent(hack.hackid)}`)
        .auth('sack', 'boy')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      authenticateHeader = res.header['www-authenticate']
      response = res.body

      deletedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
    })

    it('should respond with status code 401 Unauthorised', () => {
      assert.strictEqual(statusCode, 401)
    })

    it('should respond with WWW-Authenticate header for basic realm "Attendee access"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="Attendee access", error="Bad username or password"')
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Unauthorized" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '401')
      assert.strictEqual(response.errors[0].title, 'Unauthorized')
      assert.strictEqual(response.errors[0].detail, 'Bad username or password')
    })

    it('should not delete the hack', () => {
      assert.strictEqual(deletedHack.hackid, hack.hackid)
    })

    after(() => MongoDB.Hacks.removeByHackId(hack.hackid))

  })

})
