import * as assert from 'assert'
import { MongoDB } from './utils/mongodb'
import { User } from './models/users'
import { Team } from './models/teams'
import { Attendee } from './models/attendees'
import { ApiServer } from './utils/apiserver'
import * as request from 'supertest'
import { JSONApi, UserResource, UsersResource, TeamResource } from '../resources'
import { Random } from './utils/random'
import { PusherListener } from './utils/pusherlistener'

describe('Users resource', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('OPTIONS user by ID', () => {

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

      const user = MongoDB.Users.createRandomUser()

      const res = await api.options(`/users/${user.userid}`)
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

  describe('GET user by ID', () => {

    let origin: string
    let user: User
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: UserResource.TopLevelDocument

    before(async () => {
      origin = Random.str()

      user = await MongoDB.Users.insertRandomUser()

      const res = await api.get(`/users/${user.userid}`)
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

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`)
    })

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users')
    })

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid)
    })

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name)
    })

    it('should return the team relationship self link', () => {
      assert.strictEqual(response.data.relationships.team.links.self, `/users/${user.userid}/team`)
    })

    it('should not return a team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data, null)
    })

    after(() => MongoDB.Users.removeByUserId(user.userid))

  })

  describe('OPTIONS users', () => {

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

      const res = await api.options('/users')
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

  describe('GET users in teams', () => {

    let origin: string
    let user: User
    let otherUser: User
    let team: Team
    let otherTeam: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: UsersResource.TopLevelDocument

    before(async () => {
      origin = Random.str()

      await MongoDB.Users.removeAll()

      user = await MongoDB.Users.insertRandomUser('A')
      otherUser = await MongoDB.Users.insertRandomUser('B')

      team = await MongoDB.Teams.createRandomTeam('A')
      team.members = [user._id]
      delete team.motto
      await MongoDB.Teams.insertTeam(team)
      otherTeam = await MongoDB.Teams.insertRandomTeam([otherUser._id], 'B')

      const res = await api.get(`/users`)
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

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users`)
    })

    it('should return the first user', () => {
      const thisUser = response.data[0]
      assert.strictEqual(thisUser.type, 'users')
      assert.strictEqual(thisUser.id, user.userid)
      assert.strictEqual(thisUser.attributes.name, user.name)
      assert.strictEqual(thisUser.relationships.team.links.self, `/users/${user.userid}/team`)
      assert.strictEqual(thisUser.relationships.team.data.type, 'teams')
      assert.strictEqual(thisUser.relationships.team.data.id, team.teamid)
    })

    it('should return the second user', () => {
      const thisUser = response.data[1]
      assert.strictEqual(thisUser.type, 'users')
      assert.strictEqual(thisUser.id, otherUser.userid)
      assert.strictEqual(thisUser.attributes.name, otherUser.name)
      assert.strictEqual(thisUser.relationships.team.links.self, `/users/${otherUser.userid}/team`)
      assert.strictEqual(thisUser.relationships.team.data.type, 'teams')
      assert.strictEqual(thisUser.relationships.team.data.id, otherTeam.teamid)
    })

    it('should include the first team', () => {
      const includedTeam = response.included[0] as TeamResource.ResourceObject
      assert.strictEqual(includedTeam.links.self, `/teams/${team.teamid}`)
      assert.strictEqual(includedTeam.id, team.teamid)
      assert.strictEqual(includedTeam.attributes.name, team.name)
      assert.strictEqual(includedTeam.attributes.motto, null)
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${team.teamid}/members`)
      assert.strictEqual(includedTeam.relationships.members.data.length, 1)
      assert.strictEqual(includedTeam.relationships.members.data[0].type, 'users')
      assert.strictEqual(includedTeam.relationships.members.data[0].id, user.userid)
    })

    it('should include the second team', () => {
      const includedTeam = response.included[1] as TeamResource.ResourceObject
      assert.strictEqual(includedTeam.links.self, `/teams/${otherTeam.teamid}`)
      assert.strictEqual(includedTeam.id, otherTeam.teamid)
      assert.strictEqual(includedTeam.attributes.name, otherTeam.name)
      assert.strictEqual(includedTeam.attributes.motto, otherTeam.motto)
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${otherTeam.teamid}/members`)
      assert.strictEqual(includedTeam.relationships.members.data.length, 1)
      assert.strictEqual(includedTeam.relationships.members.data[0].type, 'users')
      assert.strictEqual(includedTeam.relationships.members.data[0].id, otherUser.userid)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Teams.removeByTeamId(otherTeam.teamid),
      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Users.removeByUserId(otherUser.userid),
    ]))

  })

  describe('GET user by ID in team', () => {

    let origin: string
    let user: User
    let otherUser: User
    let team: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: UserResource.TopLevelDocument
    let includedTeam: TeamResource.ResourceObject
    let includedUser: UserResource.ResourceObject

    before(async () => {
      origin = Random.str()

      user = await MongoDB.Users.insertRandomUser('A')
      otherUser = await MongoDB.Users.insertRandomUser('B')
      team = await MongoDB.Teams.insertRandomTeam([user._id, otherUser._id])

      const res = await api.get(`/users/${user.userid}`)
        .set('Origin', origin)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
      includedTeam = response.included.find((include) => include.type === 'teams') as TeamResource.ResourceObject
      includedUser = response.included.find((include) => include.type === 'users') as UserResource.ResourceObject
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

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`)
    })

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users')
    })

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid)
    })

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name)
    })

    it('should return the team relationship self link', () => {
      assert.strictEqual(response.data.relationships.team.links.self, `/users/${user.userid}/team`)
    })

    it('should return the team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data.type, 'teams')
      assert.strictEqual(response.data.relationships.team.data.id, team.teamid)
    })

    it('should include the related team', () => {
      assert.ok(includedTeam, 'Included team missing')
      assert.strictEqual(includedTeam.links.self, `/teams/${team.teamid}`)
      assert.strictEqual(includedTeam.id, team.teamid)
      assert.strictEqual(includedTeam.attributes.name, team.name)
      assert.strictEqual(includedTeam.attributes.motto, team.motto)
    })

    it('should include the related team members', () => {
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${team.teamid}/members`)
      assert.strictEqual(includedTeam.relationships.members.data.length, 2)

      const relatedUser = includedTeam.relationships.members.data[0]
      assert.strictEqual(relatedUser.type, 'users')
      assert.strictEqual(relatedUser.id, user.userid)

      const relatedOtherUser = includedTeam.relationships.members.data[1]
      assert.strictEqual(relatedOtherUser.type, 'users')
      assert.strictEqual(relatedOtherUser.id, otherUser.userid)
    })

    it('should include the related team', () => {
      assert.ok(includedUser, 'Included user missing')
      assert.strictEqual(includedUser.id, otherUser.userid)
      assert.strictEqual(includedUser.attributes.name, otherUser.name)
    })

    it('should include the related other user team relationship', () => {
      assert.strictEqual(includedUser.relationships.team.links.self, `/teams/${team.teamid}`)
      assert.strictEqual(includedUser.relationships.team.data.type, 'teams')
      assert.strictEqual(includedUser.relationships.team.data.id, team.teamid)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Users.removeByUserId(otherUser.userid),
    ]))

  })

  describe('GET user by ID in team without a motto', () => {

    let origin: string
    let user: User
    let otherUser: User
    let team: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: UserResource.TopLevelDocument
    let includedTeam: TeamResource.ResourceObject
    let includedUser: UserResource.ResourceObject

    before(async () => {
      origin = Random.str()

      user = await MongoDB.Users.insertRandomUser('A')
      otherUser = await MongoDB.Users.insertRandomUser('B')
      team = await MongoDB.Teams.createRandomTeam()
      team.members = [user._id, otherUser._id]
      delete team.motto
      await MongoDB.Teams.insertTeam(team)

      const res = await api.get(`/users/${user.userid}`)
        .set('Origin', origin)
        .set('Accept', 'application/json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      accessControlAllowOrigin = res.header['access-control-allow-origin']
      accessControlExposeHeaders = res.header['access-control-expose-headers']
      response = res.body
      includedTeam = response.included.find((include) => include.type === 'teams') as TeamResource.ResourceObject
      includedUser = response.included.find((include) => include.type === 'users') as UserResource.ResourceObject
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

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`)
    })

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users')
    })

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid)
    })

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name)
    })

    it('should return the team relationship self link', () => {
      assert.strictEqual(response.data.relationships.team.links.self, `/users/${user.userid}/team`)
    })

    it('should return the team relationship', () => {
      assert.strictEqual(response.data.relationships.team.data.type, 'teams')
      assert.strictEqual(response.data.relationships.team.data.id, team.teamid)
    })

    it('should include the related team', () => {
      assert.ok(includedTeam, 'Included team missing')
      assert.strictEqual(includedTeam.links.self, `/teams/${team.teamid}`)
      assert.strictEqual(includedTeam.id, team.teamid)
      assert.strictEqual(includedTeam.attributes.name, team.name)
      assert.strictEqual(includedTeam.attributes.motto, null)
    })

    it('should include the related team members', () => {
      assert.strictEqual(includedTeam.relationships.members.links.self, `/teams/${team.teamid}/members`)
      assert.strictEqual(includedTeam.relationships.members.data.length, 2)

      const relatedUser = includedTeam.relationships.members.data[0]
      assert.strictEqual(relatedUser.type, 'users')
      assert.strictEqual(relatedUser.id, user.userid)

      const relatedOtherUser = includedTeam.relationships.members.data[1]
      assert.strictEqual(relatedOtherUser.type, 'users')
      assert.strictEqual(relatedOtherUser.id, otherUser.userid)
    })

    it('should include the related team', () => {
      assert.ok(includedUser, 'Included user missing')
      assert.strictEqual(includedUser.id, otherUser.userid)
      assert.strictEqual(includedUser.attributes.name, otherUser.name)
    })

    it('should include the related other user team relationship', () => {
      assert.strictEqual(includedUser.relationships.team.links.self, `/teams/${team.teamid}`)
      assert.strictEqual(includedUser.relationships.team.data.type, 'teams')
      assert.strictEqual(includedUser.relationships.team.data.id, team.teamid)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Users.removeByUserId(otherUser.userid),
    ]))

  })

  describe('POST new user', () => {

    let attendee: Attendee
    let user: User
    let createdUser: User
    let statusCode: number
    let contentType: string
    let response: UserResource.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      user = MongoDB.Users.createRandomUser()

      const requestDoc: UserResource.TopLevelDocument = {
        data: {
          type: 'users',
          id: user.userid,
          attributes: {
            name: user.name,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/users')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .send(requestDoc)
        .type('application/vnd.api+json')
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdUser = await MongoDB.Users.findbyUserId(user.userid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return the user resource object self link', () => {
      assert.strictEqual(response.links.self, `/users/${user.userid}`)
    })

    it('should return the users type', () => {
      assert.strictEqual(response.data.type, 'users')
    })

    it('should return the user id', () => {
      assert.strictEqual(response.data.id, user.userid)
    })

    it('should return the user name', () => {
      assert.strictEqual(response.data.attributes.name, user.name)
    })

    it('should create the user with the expected ID and name', () => {
      assert.ok(createdUser, 'User not found')
      assert.strictEqual(createdUser.userid, user.userid)
      assert.strictEqual(createdUser.name, user.name)
    })

    it('should send a users_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.userid === user.userid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'users_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, user.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Users.removeByUserId(user.userid),

      pusherListener.close(),
    ]))

  })

  describe('POST user with existing ID', () => {

    let attendee: Attendee
    let user: User
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      user = await MongoDB.Users.insertRandomUser()

      const requestDoc: UserResource.TopLevelDocument = {
        data: {
          type: 'users',
          id: user.userid,
          attributes: {
            name: user.name,
          },
        },
      }

      const res = await api.post('/users')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(requestDoc)
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
      assert.strictEqual(response.errors[0].detail, 'User already exists')
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Users.removeByUserId(user.userid),
    ]))

  })

  describe('GET missing user by ID', () => {

    let origin: string
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      origin = Random.str()

      const res = await api.get('/users/U' + Random.int(10000, 99999))
        .set('Origin', origin)
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

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should allow the origin access to the resource with GET', () => {
      assert.strictEqual(accessControlAllowOrigin, origin)
      assert.deepEqual(accessControlExposeHeaders.split(','), ['WWW-Authenticate', 'Server-Authorization'])
    })

    it('should respond with the expected "User not found" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '404')
      assert.strictEqual(response.errors[0].title, 'Not Found')
      assert.strictEqual(response.errors[0].detail, 'User not found')
    })

  })

  describe('POST new user without authentication', () => {

    let userId: string
    let createdUser: User
    let statusCode: number
    let contentType: string
    let authenticateHeader: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      userId = 'U' + Random.int(10000, 99999)

      const res = await api.post('/users')
        .type('application/vnd.api+json')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      authenticateHeader = res.header['www-authenticate']
      response = res.body

      createdUser = await MongoDB.Users.findbyUserId(userId)
    })

    it('should respond with status code 401 Unauthorised', () => {
      assert.strictEqual(statusCode, 401)
    })

    it('should respond with WWW-Authenticate header for basic realm "Attendee access"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="Attendee access"')
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should respond with the expected "Unauthorized" error', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '401')
      assert.strictEqual(response.errors[0].title, 'Unauthorized')
      assert.strictEqual(response.errors[0].detail, 'Credentials required')
    })

    it('should not create the user document', () => {
      assert.strictEqual(createdUser, null)
    })

    after(() => MongoDB.Users.removeByUserId(userId))

  })

  describe('POST new user with incorrect authentication', () => {

    let userId: string
    let createdUser: User
    let statusCode: number
    let contentType: string
    let authenticateHeader: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      userId = 'U' + Random.int(10000, 99999)

      const res = await api.post('/users')
        .auth('hackbot', 'incorrect_password')
        .type('application/vnd.api+json')
        .send({ userid: userId, name: 'Name_' + Random.str(5) })
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      authenticateHeader = res.header['www-authenticate']
      response = res.body

      createdUser = await MongoDB.Users.findbyUserId(userId)
    })

    it('should respond with status code 401 Unauthorised', () => {
      assert.strictEqual(statusCode, 401)
    })

    it('should respond with WWW-Authenticate header for basic realm "Attendee access"', () => {
      assert.strictEqual(authenticateHeader, 'Basic realm="Attendee access"')
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

    it('should not create the user document', () => {
      assert.strictEqual(createdUser, null)
    })

    after(() => MongoDB.Users.removeByUserId(userId))

  })

})
