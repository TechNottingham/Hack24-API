import * as assert from 'assert'
import { MongoDB } from './utils/mongodb'
import { User } from './models/users'
import { Team } from './models/teams'
import { Attendee } from './models/attendees'
import { ApiServer } from './utils/apiserver'
import * as request from 'supertest'
import { JSONApi, TeamMembersRelationship, UserResource } from '../resources'
import { PusherListener } from './utils/pusherlistener'
import { Random } from './utils/random'

describe('Team Members relationship', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('OPTIONS team members', () => {

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

      const team = MongoDB.Teams.createRandomTeam()

      const res = await api.options(`/teams/${team.teamid}/members`)
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

  describe('GET team members', () => {

    let origin: string
    let firstUser: User
    let secondUser: User
    let thirdUser: User
    let team: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: TeamMembersRelationship.TopLevelDocument

    before(async () => {
      origin = Random.str()

      firstUser = await MongoDB.Users.insertRandomUser('A')
      secondUser = await MongoDB.Users.insertRandomUser('B')
      thirdUser = await MongoDB.Users.insertRandomUser('C')

      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id, thirdUser._id])

      const res = await api.get(`/teams/${team.teamid}/members`)
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

    it('should return the team members self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}/members`)
    })

    it('should return each member', () => {
      assert.strictEqual(response.data[0].type, 'users')
      assert.strictEqual(response.data[0].id, firstUser.userid)

      assert.strictEqual(response.data[1].type, 'users')
      assert.strictEqual(response.data[1].id, secondUser.userid)

      assert.strictEqual(response.data[2].type, 'users')
      assert.strictEqual(response.data[2].id, thirdUser.userid)
    })

    it('should include each expected user', () => {
      const users = response.included as UserResource.ResourceObject[]

      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`)
      assert.strictEqual(users[0].id, firstUser.userid)
      assert.strictEqual(users[0].attributes.name, firstUser.name)

      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`)
      assert.strictEqual(users[1].id, secondUser.userid)
      assert.strictEqual(users[1].attributes.name, secondUser.name)

      assert.strictEqual(users[2].links.self, `/users/${thirdUser.userid}`)
      assert.strictEqual(users[2].id, thirdUser.userid)
      assert.strictEqual(users[2].attributes.name, thirdUser.name)
    })

    after(() => Promise.all([
      MongoDB.Users.removeByUserId(firstUser.userid),
      MongoDB.Users.removeByUserId(secondUser.userid),
      MongoDB.Users.removeByUserId(thirdUser.userid),

      MongoDB.Teams.removeByTeamId(team.teamid),
    ]))

  })

  describe('DELETE multiple team members', () => {

    let attendee: Attendee
    let firstUser: User
    let secondUser: User
    let thirdUser: User
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      firstUser = await MongoDB.Users.insertRandomUser('A')
      secondUser = await MongoDB.Users.insertRandomUser('B')
      thirdUser = await MongoDB.Users.insertRandomUser('C')

      team = await MongoDB.Teams.insertRandomTeam([firstUser._id, secondUser._id, thirdUser._id])

      const req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: firstUser.userid,
        }, {
          type: 'users',
          id: thirdUser.userid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.delete(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvents(2)
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should not return a response body', () => {
      assert.strictEqual(body, '')
    })

    it('should have removed the two users from the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1)
      assert.strictEqual(modifiedTeam.members[0].equals(secondUser._id), true)
    })

    it('should send two teams_update_members_delete events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2)
    })

    it('should send a teams_update_members_delete event for the first team member', () => {
      const event = pusherListener.getEvent((ev) => ev.data.member.userid === firstUser.userid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_update_members_delete')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.teamid, team.teamid)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.member.userid, firstUser.userid)
      assert.strictEqual(data.member.name, firstUser.name)
    })

    it('should send a teams_update_members_delete event for the third team member', () => {
      const event = pusherListener.getEvent((ev) => ev.data.member.userid === thirdUser.userid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_update_members_delete')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.teamid, team.teamid)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.member.userid, thirdUser.userid)
      assert.strictEqual(data.member.name, thirdUser.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Users.removeByUserId(firstUser.userid),
      MongoDB.Users.removeByUserId(secondUser.userid),
      MongoDB.Users.removeByUserId(thirdUser.userid),

      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe("DELETE team members which don't exist", () => {

    let attendee: Attendee
    let user: User
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      user = await MongoDB.Users.insertRandomUser()
      team = await MongoDB.Teams.insertRandomTeam([user._id])

      const req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: user.userid,
        }, {
          type: 'users',
          id: 'does not exist',
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.delete(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 400 Bad Request', () => {
      assert.strictEqual(statusCode, 400)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return an error with status code 400 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '400')
      assert.strictEqual(response.errors[0].title, 'Bad Request')
    })

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1)
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('POST team members', () => {

    let attendee: Attendee
    let user: User
    let firstNewUser: User
    let secondNewUser: User
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      user = await MongoDB.Users.insertRandomUser('A')
      firstNewUser = await MongoDB.Users.insertRandomUser('B')
      secondNewUser = await MongoDB.Users.insertRandomUser('C')

      team = await MongoDB.Teams.insertRandomTeam([user._id])

      const req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: firstNewUser.userid,
        }, {
          type: 'users',
          id: secondNewUser.userid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvents(2)
    })

    it('should respond with status code 204 No Content', () => {
      assert.strictEqual(statusCode, 204)
    })

    it('should not return a content-type', () => {
      assert.strictEqual(contentType, undefined)
    })

    it('should not return a response body', () => {
      assert.strictEqual(body, '')
    })

    it('should have added the new user to the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 3)
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true)
      assert.strictEqual(modifiedTeam.members[1].equals(firstNewUser._id), true)
      assert.strictEqual(modifiedTeam.members[2].equals(secondNewUser._id), true)
    })

    it('should send two teams_update_members_add events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2)
    })

    it('should send a teams_update_members_add event for the first new team member', () => {
      const event = pusherListener.getEvent((ev) => ev.data.member.userid === firstNewUser.userid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_update_members_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.teamid, team.teamid)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.member.userid, firstNewUser.userid)
      assert.strictEqual(data.member.name, firstNewUser.name)
    })

    it('should send a teams_update_members_add event for the second new team member', () => {
      const event = pusherListener.getEvent((ev) => ev.data.member.userid === secondNewUser.userid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_update_members_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.teamid, team.teamid)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.member.name, secondNewUser.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Users.removeByUserId(firstNewUser.userid),
      MongoDB.Users.removeByUserId(secondNewUser.userid),

      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('POST team members already in a team', () => {

    let attendee: Attendee
    let user: User
    let otherUser: User
    let team: Team
    let otherTeam: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      user = await MongoDB.Users.insertRandomUser()
      otherUser = await MongoDB.Users.insertRandomUser()

      team = await MongoDB.Teams.insertRandomTeam([user._id])
      otherTeam = await MongoDB.Teams.insertRandomTeam([otherUser._id])

      const req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: otherUser.userid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 400 Bad Request', () => {
      assert.strictEqual(statusCode, 400)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return an error with status code 400 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '400')
      assert.strictEqual(response.errors[0].title, 'Bad Request')
      assert.strictEqual(response.errors[0].detail, 'One or more of the specified users are already in a team')
    })

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 1)
      assert.strictEqual(modifiedTeam.members[0].equals(user._id), true)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Users.removeByUserId(otherUser.userid),

      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Teams.removeByTeamId(otherTeam.teamid),

      pusherListener.close(),
    ]))

  })

  describe('POST team members which do not exist', () => {

    let attendee: Attendee
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      team = await MongoDB.Teams.insertRandomTeam()

      const req: TeamMembersRelationship.TopLevelDocument = {
        data: [{
          type: 'users',
          id: 'does not exist',
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/teams/${team.teamid}/members`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 400 Bad Request', () => {
      assert.strictEqual(statusCode, 400)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return an error with status code 400 and the expected title', () => {
      assert.strictEqual(response.errors.length, 1)
      assert.strictEqual(response.errors[0].status, '400')
      assert.strictEqual(response.errors[0].title, 'Bad Request')
      assert.strictEqual(response.errors[0].detail, 'One or more of the specified users could not be found')
    })

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.members.length, 0)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

})
