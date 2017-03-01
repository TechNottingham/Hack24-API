import * as assert from 'assert'
import {UsersInfoResponse} from '@slack/client'
import {MongoDB} from './utils/mongodb'
import {User} from './models/users'
import {Team} from './models/teams'
import {Hack} from './models/hacks'
import {Challenge} from './models/challenges'
import {Attendee} from './models/attendees'
import {ApiServer} from './utils/apiserver'
import * as request from 'supertest'
import {JSONApi, TeamsResource, TeamResource, UserResource, HackResource, ChallengeResource} from '../resources'
import {PusherListener} from './utils/pusherlistener'
import {SlackApi} from './utils/slackapi'

describe('Teams resource', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('POST new team', () => {

    let attendee: Attendee
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let contentType: string
    let response: TeamResource.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`)
    })

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams')
    })

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid)
    })

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name)
    })

    it('should return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, team.motto)
    })

    it('should create the team', () => {
      assert.ok(createdTeam, 'Team not found')
      assert.strictEqual(createdTeam.teamid, team.teamid)
      assert.strictEqual(createdTeam.name, team.name)
      assert.strictEqual(createdTeam.motto, team.motto)
    })

    it('should not add any members to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 0)
    })

    it('should send a teams_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.teamid === team.teamid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.motto, team.motto)
      assert.strictEqual(data.members.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      pusherListener.close(),
    ]))

  })

  describe('POST new team with slackid', () => {

    let attendee: Attendee
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee('', true)
      team = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/teams')
        .auth(attendee.slackid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      pusherListener.close(),
    ]))

  })

  describe('POST new team with unknown slackid', () => {

    let attendee: Attendee
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let slackApi: SlackApi
    let pusherListener: PusherListener

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee('', true)
      const slackid = attendee.slackid
      attendee.slackid = undefined
      await MongoDB.Attendees.insertAttendee(attendee)
      team = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      slackApi = await SlackApi.Create(ApiServer.SlackApiPort, ApiServer.SlackApiBasePath)
      slackApi.UsersList = <UsersInfoResponse> {
        ok: true,
        user: {
          id: slackid,
          profile: {
            email: attendee.attendeeid,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/teams')
        .auth(slackid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      slackApi.close(),
      pusherListener.close(),
    ]))

  })

  describe('POST new team with slackid for unregistered attendee', () => {

    let attendee: Attendee
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let slackApi: SlackApi

    before(async () => {
      attendee = MongoDB.Attendees.createRandomAttendee('', true)
      const slackid = attendee.slackid
      attendee.slackid = undefined
      await MongoDB.Attendees.insertAttendee(attendee)
      team = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      slackApi = await SlackApi.Create(ApiServer.SlackApiPort, ApiServer.SlackApiBasePath)
      slackApi.UsersList = <UsersInfoResponse> {
        ok: true,
        user: {
          id: slackid,
          profile: {
            email: 'some@unregistered.attendee.email',
          },
        },
      }

      const res = await api.post('/teams')
        .auth(slackid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
    })

    it('should respond with status code 403 Forbidden', () => {
      assert.strictEqual(statusCode, 403)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      slackApi.close(),
    ]))

  })

  describe('POST new team without motto', () => {

    let attendee: Attendee
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let contentType: string
    let response: TeamResource.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = MongoDB.Teams.createRandomTeam()

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
          },
        },
      }

      const res = await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should not return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, null)
    })

    it('should create the team', () => {
      assert.ok(createdTeam, 'Team not found')
      assert.strictEqual(createdTeam.teamid, team.teamid)
      assert.strictEqual(createdTeam.name, team.name)
      assert.strictEqual(createdTeam.motto, null)
      assert.strictEqual(createdTeam.members.length, 0)
    })

    it('should send a teams_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.teamid === team.teamid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.motto, null)
      assert.strictEqual(data.members.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      pusherListener.close(),
    ]))

  })

  describe('POST new team with members and hacks', () => {

    let attendee: Attendee
    let user: User
    let hack: Hack
    let team: Team
    let createdTeam: Team
    let statusCode: number
    let contentType: string
    let response: TeamResource.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      user = await MongoDB.Users.insertRandomUser()
      hack = await MongoDB.Hacks.insertRandomHack()
      team = await MongoDB.Teams.createRandomTeam()

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
          relationships: {
            members: {
              data: [{ type: 'users', id: user.userid }],
            },
            entries: {
              data: [{ type: 'hacks', id: hack.hackid }],
            },
          },
        },
      }

      const res = await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
    })

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201)
    })

    it('should return application/vnd.api+json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/vnd.api+json; charset=utf-8')
    })

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`)
    })

    it('should return the team type', () => {
      assert.strictEqual(response.data.type, 'teams')
    })

    it('should return the team id', () => {
      assert.strictEqual(response.data.id, team.teamid)
    })

    it('should return the team name', () => {
      assert.strictEqual(response.data.attributes.name, team.name)
    })

    it('should return the team motto', () => {
      assert.strictEqual(response.data.attributes.motto, team.motto)
    })

    it('should create the team with the expected id and name', () => {
      assert.ok(createdTeam, 'Team not found')
      assert.strictEqual(createdTeam.teamid, team.teamid)
      assert.strictEqual(createdTeam.name, team.name)
      assert.strictEqual(createdTeam.motto, team.motto)
    })

    it('should add the member to the created team', () => {
      assert.strictEqual(createdTeam.members.length, 1)
      assert.strictEqual(createdTeam.members[0].equals(user._id), true)
    })

    it('should add the hack to the created team', () => {
      assert.strictEqual(createdTeam.entries.length, 1)
      assert.strictEqual(createdTeam.entries[0].equals(hack._id), true)
    })

    it('should send a teams_add event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.teamid === team.teamid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.motto, team.motto)

      assert.strictEqual(data.members.length, 1)
      assert.strictEqual(data.members[0].userid, user.userid)
      assert.strictEqual(data.members[0].name, user.name)

      assert.strictEqual(data.entries.length, 1)
      assert.strictEqual(data.entries[0].hackid, hack.hackid)
      assert.strictEqual(data.entries[0].name, hack.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Users.removeByUserId(user.userid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('POST team which already exists', () => {

    let attendee: Attendee
    let team: Team
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/teams')
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      await pusherListener.waitForEvent()
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

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),
      pusherListener.close(),
    ]))

  })

  describe('POST team with incorrect authentication', () => {

    let createdTeam: Team
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      const team = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          attributes: {
            name: team.name,
            motto: team.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post('/teams')
        .auth('not@user.com', ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      createdTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
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

    it('should not create the team document', () => {
      assert.strictEqual(createdTeam, null)
    })

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => pusherListener.close())

  })

  describe('OPTIONS teams', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: string

    before(async () => {
      const res = await api.options('/teams').end()

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

  describe('GET teams', () => {

    let firstChallenge: Challenge
    let secondChallenge: Challenge
    let firstUser: User
    let secondUser: User
    let thirdUser: User
    let firstHack: Hack
    let secondHack: Hack
    let thirdHack: Hack
    let firstTeam: Team
    let secondTeam: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: TeamsResource.TopLevelDocument

    before(async () => {
      await MongoDB.Teams.removeAll()

      firstChallenge = await MongoDB.Challenges.insertRandomChallenge('A')
      secondChallenge = await MongoDB.Challenges.insertRandomChallenge('B')

      firstUser = await MongoDB.Users.insertRandomUser('A')
      secondUser = await MongoDB.Users.insertRandomUser('B')
      thirdUser = await MongoDB.Users.insertRandomUser('C')

      firstHack = MongoDB.Hacks.createRandomHack('A')
      firstHack.challenges = [firstChallenge._id]
      await MongoDB.Hacks.insertHack(firstHack)
      secondHack = await MongoDB.Hacks.insertRandomHack('B')
      thirdHack = MongoDB.Hacks.createRandomHack('C')
      thirdHack.challenges = [secondChallenge._id]
      await MongoDB.Hacks.insertHack(thirdHack)

      firstTeam = MongoDB.Teams.createRandomTeam('A')
      firstTeam.members = [firstUser._id]
      firstTeam.entries = [firstHack._id]
      delete firstTeam.motto
      await MongoDB.Teams.insertTeam(firstTeam)

      secondTeam = await MongoDB.Teams.createRandomTeam('B')
      secondTeam.members = [secondUser._id, thirdUser._id]
      secondTeam.entries = [secondHack._id, thirdHack._id]
      await MongoDB.Teams.insertTeam(secondTeam)

      const res = await api.get('/teams').end()

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

    it('should return the teams resource object self link', () => {
      assert.strictEqual(response.links.self, '/teams')
    })

    it('should return the first team', () => {
      const teamResponse = response.data[0]

      assert.strictEqual(teamResponse.type, 'teams')
      assert.strictEqual(teamResponse.id, firstTeam.teamid)
      assert.strictEqual(teamResponse.attributes.name, firstTeam.name)
      assert.strictEqual(teamResponse.attributes.motto, null)

      assert.strictEqual(teamResponse.relationships.members.data.length, 1)
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users')
      assert.strictEqual(teamResponse.relationships.members.data[0].id, firstUser.userid)

      assert.strictEqual(teamResponse.relationships.entries.data.length, 1)
      assert.strictEqual(teamResponse.relationships.entries.data[0].type, 'hacks')
      assert.strictEqual(teamResponse.relationships.entries.data[0].id, firstHack.hackid)
    })

    it('should return the second team', () => {
      const teamResponse = response.data[1]

      assert.strictEqual(teamResponse.type, 'teams')
      assert.strictEqual(teamResponse.id, secondTeam.teamid)
      assert.strictEqual(teamResponse.attributes.name, secondTeam.name)
      assert.strictEqual(teamResponse.attributes.motto, secondTeam.motto)

      assert.strictEqual(teamResponse.relationships.members.data.length, 2)
      assert.strictEqual(teamResponse.relationships.members.data[0].type, 'users')
      assert.strictEqual(teamResponse.relationships.members.data[0].id, secondUser.userid)

      assert.strictEqual(teamResponse.relationships.members.data[1].type, 'users')
      assert.strictEqual(teamResponse.relationships.members.data[1].id, thirdUser.userid)

      assert.strictEqual(teamResponse.relationships.entries.data.length, 2)
      assert.strictEqual(teamResponse.relationships.entries.data[0].type, 'hacks')
      assert.strictEqual(teamResponse.relationships.entries.data[0].id, secondHack.hackid)

      assert.strictEqual(teamResponse.relationships.entries.data[1].type, 'hacks')
      assert.strictEqual(teamResponse.relationships.entries.data[1].id, thirdHack.hackid)
    })

    it('should include the related members, entries and challenges', () => {
      assert.strictEqual(response.included.length, 8)
      assert.strictEqual(response.included.filter((obj) => obj.type === 'users').length, 3)
      assert.strictEqual(response.included.filter((obj) => obj.type === 'hacks').length, 3)
      assert.strictEqual(response.included.filter((obj) => obj.type === 'challenges').length, 2)
    })

    it('should include each expected users', () => {
      const users = <UserResource.ResourceObject[]> response.included.filter((doc) => doc.type === 'users')

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

    it('should include each expected hack', () => {
      const hacks = <HackResource.ResourceObject[]> response.included.filter((doc) => doc.type === 'hacks')

      assert.strictEqual(hacks[0].links.self, `/hacks/${firstHack.hackid}`)
      assert.strictEqual(hacks[0].id, firstHack.hackid)
      assert.strictEqual(hacks[0].attributes.name, firstHack.name)

      const firstHackChallenges = (hacks[0].relationships['challenges'] as JSONApi.ToManyRelationshipsObject).data
      assert.strictEqual(firstHackChallenges[0].id, firstChallenge.challengeid)
      assert.strictEqual(firstHackChallenges[0].type, 'challenges')

      assert.strictEqual(hacks[1].links.self, `/hacks/${secondHack.hackid}`)
      assert.strictEqual(hacks[1].id, secondHack.hackid)
      assert.strictEqual(hacks[1].attributes.name, secondHack.name)

      assert.strictEqual(hacks[2].links.self, `/hacks/${thirdHack.hackid}`)
      assert.strictEqual(hacks[2].id, thirdHack.hackid)
      assert.strictEqual(hacks[2].attributes.name, thirdHack.name)

      const secondHackChallenges = (hacks[2].relationships['challenges'] as JSONApi.ToManyRelationshipsObject).data
      assert.strictEqual(secondHackChallenges[0].id, secondChallenge.challengeid)
      assert.strictEqual(secondHackChallenges[0].type, 'challenges')
    })

    it('should include each expected challenge from hacks', () => {
      const challenges = <ChallengeResource.ResourceObject[]> response.included.filter((doc) => doc.type === 'challenges')

      assert.strictEqual(challenges[0].links.self, `/challenges/${firstChallenge.challengeid}`)
      assert.strictEqual(challenges[0].id, firstChallenge.challengeid)
      assert.strictEqual(challenges[0].attributes.name, firstChallenge.name)

      assert.strictEqual(challenges[1].links.self, `/challenges/${secondChallenge.challengeid}`)
      assert.strictEqual(challenges[1].id, secondChallenge.challengeid)
      assert.strictEqual(challenges[1].attributes.name, secondChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Challenges.removeByChallengeId(firstChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondChallenge.challengeid),

      MongoDB.Users.removeByUserId(firstUser.userid),
      MongoDB.Users.removeByUserId(secondUser.userid),
      MongoDB.Users.removeByUserId(thirdUser.userid),

      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Hacks.removeByHackId(thirdHack.hackid),

      MongoDB.Teams.removeByTeamId(firstTeam.teamid),
      MongoDB.Teams.removeByTeamId(secondTeam.teamid),
    ]))

  })

  describe('OPTIONS teams by slug (teamid)', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: string

    before(async () => {
      let team = MongoDB.Teams.createRandomTeam()

      const res = await api.options(`/teams/${team.teamid}`).end()

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

  describe('GET team by slug (teamid)', () => {

    let challenge: Challenge
    let firstUser: User
    let secondUser: User
    let firstHack: Hack
    let secondHack: Hack
    let team: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: TeamResource.TopLevelDocument

    before(async () => {
      challenge = await MongoDB.Challenges.insertRandomChallenge()

      firstUser = await MongoDB.Users.insertRandomUser('A')
      secondUser = await MongoDB.Users.insertRandomUser('B')

      firstHack = MongoDB.Hacks.createRandomHack('A')
      firstHack.challenges = [challenge._id]
      await MongoDB.Hacks.insertHack(firstHack)
      secondHack = await MongoDB.Hacks.insertRandomHack('B')

      team = MongoDB.Teams.createRandomTeam()
      team.members = [firstUser._id, secondUser._id]
      team.entries = [firstHack._id, secondHack._id]
      await MongoDB.Teams.insertTeam(team)

      const res = await api.get(`/teams/${team.teamid}`)
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

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`)
    })

    it('should return the team primary data', () => {
      assert.strictEqual(response.data.type, 'teams')
      assert.strictEqual(response.data.id, team.teamid)
      assert.strictEqual(response.data.attributes.name, team.name)
      assert.strictEqual(response.data.attributes.motto, team.motto)
    })

    it('should return the user relationships', () => {
      const users = response.data.relationships.members.data

      assert.strictEqual(users[0].type, 'users')
      assert.strictEqual(users[0].id, firstUser.userid)
      assert.strictEqual(users[1].type, 'users')
      assert.strictEqual(users[1].id, secondUser.userid)
    })

    it('should return the hack relationships', () => {
      const hacks = response.data.relationships.entries.data

      assert.strictEqual(hacks[0].type, 'hacks')
      assert.strictEqual(hacks[0].id, firstHack.hackid)
      assert.strictEqual(hacks[1].type, 'hacks')
      assert.strictEqual(hacks[1].id, secondHack.hackid)
    })

    it('should include the related members, entries and challenges', () => {
      assert.strictEqual(response.included.length, 5)

      const users = <UserResource.ResourceObject[]> response.included.filter((o) => o.type === 'users')
      assert.strictEqual(users.length, 2)
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`)
      assert.strictEqual(users[0].id, firstUser.userid)
      assert.strictEqual(users[0].attributes.name, firstUser.name)
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`)
      assert.strictEqual(users[1].id, secondUser.userid)
      assert.strictEqual(users[1].attributes.name, secondUser.name)

      const hacks = <HackResource.ResourceObject[]> response.included.filter((o) => o.type === 'hacks')
      assert.strictEqual(hacks.length, 2)
      assert.strictEqual(hacks[0].links.self, `/hacks/${firstHack.hackid}`)
      assert.strictEqual(hacks[0].id, firstHack.hackid)
      assert.strictEqual(hacks[0].attributes.name, firstHack.name)

      const firstHackChallenges = (hacks[0].relationships['challenges'] as JSONApi.ToManyRelationshipsObject).data
      assert.strictEqual(firstHackChallenges[0].id, challenge.challengeid)
      assert.strictEqual(firstHackChallenges[0].type, 'challenges')

      const challenges = <ChallengeResource.ResourceObject[]> response.included.filter((o) => o.type === 'challenges')
      assert.strictEqual(challenges.length, 1)
      assert.strictEqual(challenges[0].links.self, `/challenges/${challenge.challengeid}`)
      assert.strictEqual(challenges[0].id, challenge.challengeid)
      assert.strictEqual(challenges[0].attributes.name, challenge.name)
    })

    after(() => Promise.all([
      MongoDB.Challenges.removeByChallengeId(challenge.challengeid),
      MongoDB.Users.removeByUserId(firstUser.userid),
      MongoDB.Users.removeByUserId(secondUser.userid),
      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Teams.removeByTeamId(team.teamid),
    ]))

  })

  describe('GET team by slug (teamid) without a motto', () => {

    let firstUser: User
    let secondUser: User
    let firstHack: Hack
    let secondHack: Hack
    let team: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: TeamResource.TopLevelDocument

    before(async () => {
      firstUser = await MongoDB.Users.insertRandomUser('A')
      secondUser = await MongoDB.Users.insertRandomUser('B')
      firstHack = await MongoDB.Hacks.insertRandomHack('A')
      secondHack = await MongoDB.Hacks.insertRandomHack('B')

      team = MongoDB.Teams.createRandomTeam()
      team.members = [firstUser._id, secondUser._id]
      team.entries = [firstHack._id, secondHack._id]
      delete team.motto

      await MongoDB.Teams.insertTeam(team)

      const res = await api.get(`/teams/${team.teamid}`)
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

    it('should return the team resource object self link', () => {
      assert.strictEqual(response.links.self, `/teams/${team.teamid}`)
    })

    it('should return the team primary data', () => {
      assert.strictEqual(response.data.type, 'teams')
      assert.strictEqual(response.data.id, team.teamid)
      assert.strictEqual(response.data.attributes.name, team.name)
      assert.strictEqual(response.data.attributes.motto, null)
    })

    it('should return the user relationships', () => {
      assert.strictEqual(response.data.relationships.members.data[0].type, 'users')
      assert.strictEqual(response.data.relationships.members.data[0].id, firstUser.userid)
      assert.strictEqual(response.data.relationships.members.data[1].type, 'users')
      assert.strictEqual(response.data.relationships.members.data[1].id, secondUser.userid)
    })

    it('should return the hack relationships', () => {
      assert.strictEqual(response.data.relationships.entries.data[0].type, 'hacks')
      assert.strictEqual(response.data.relationships.entries.data[0].id, firstHack.hackid)
      assert.strictEqual(response.data.relationships.entries.data[1].type, 'hacks')
      assert.strictEqual(response.data.relationships.entries.data[1].id, secondHack.hackid)
    })

    it('should include the related members and entries', () => {
      assert.strictEqual(response.included.length, 4)

      const users = <UserResource.ResourceObject[]> response.included.filter((o) => o.type === 'users')
      assert.strictEqual(users.length, 2)
      assert.strictEqual(users[0].links.self, `/users/${firstUser.userid}`)
      assert.strictEqual(users[0].id, firstUser.userid)
      assert.strictEqual(users[0].attributes.name, firstUser.name)
      assert.strictEqual(users[1].links.self, `/users/${secondUser.userid}`)
      assert.strictEqual(users[1].id, secondUser.userid)
      assert.strictEqual(users[1].attributes.name, secondUser.name)

      const hacks = <HackResource.ResourceObject[]> response.included.filter((o) => o.type === 'hacks')
      assert.strictEqual(hacks.length, 2)
      assert.strictEqual(hacks[0].links.self, `/hacks/${firstHack.hackid}`)
      assert.strictEqual(hacks[0].id, firstHack.hackid)
      assert.strictEqual(hacks[0].attributes.name, firstHack.name)
      assert.strictEqual(hacks[1].links.self, `/hacks/${secondHack.hackid}`)
      assert.strictEqual(hacks[1].id, secondHack.hackid)
      assert.strictEqual(hacks[1].attributes.name, secondHack.name)
    })

    after(() => Promise.all([
      MongoDB.Users.removeByUserId(firstUser.userid),
      MongoDB.Users.removeByUserId(secondUser.userid),
      MongoDB.Hacks.removeByHackId(firstHack.hackid),
      MongoDB.Hacks.removeByHackId(secondHack.hackid),
      MongoDB.Teams.removeByTeamId(team.teamid),
    ]))

  })

  describe('GET team by slug (teamid) which does not exist', () => {

    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: TeamResource.TopLevelDocument

    before(async () => {
      const res = await api.get(`/teams/does not exist`)
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

  describe('PATCH existing team with name', () => {

    let attendee: Attendee
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam()
      const newTeam = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            name: newTeam.name,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
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

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid)
      assert.strictEqual(modifiedTeam.name, team.name)
      assert.strictEqual(modifiedTeam.motto, team.motto)
      assert.strictEqual(modifiedTeam.members.length, 0)
    })

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('PATCH existing team without any attributes', () => {

    let attendee: Attendee
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
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

    it('should not modify the team', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid)
      assert.strictEqual(modifiedTeam.name, team.name)
      assert.strictEqual(modifiedTeam.motto, team.motto)
      assert.strictEqual(modifiedTeam.members.length, 0)
    })

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('PATCH existing team with motto', () => {

    let attendee: Attendee
    let team: Team
    let newTeam: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam()
      newTeam = MongoDB.Teams.createRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            motto: newTeam.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
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

    it('should modify the team motto', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid)
      assert.strictEqual(modifiedTeam.name, team.name)
      assert.strictEqual(modifiedTeam.motto, newTeam.motto)
      assert.strictEqual(modifiedTeam.members.length, 0)
    })

    it('should send a teams_update_motto event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 1)

      const event = pusherListener.getEvent((ev) => ev.data.teamid === team.teamid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'teams_update_motto')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.name, team.name)
      assert.strictEqual(data.motto, newTeam.motto)
      assert.strictEqual(data.members.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('PATCH existing team with same motto', () => {

    let attendee: Attendee
    let team: Team
    let modifiedTeam: Team
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam()

      const teamRequest: TeamResource.TopLevelDocument = {
        data: {
          type: 'teams',
          id: team.teamid,
          attributes: {
            motto: team.motto,
          },
        },
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.patch(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(teamRequest)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedTeam = await MongoDB.Teams.findbyTeamId(team.teamid)
      await pusherListener.waitForEvent()
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

    it('should not modify the team motto', () => {
      assert.strictEqual(modifiedTeam.teamid, team.teamid)
      assert.strictEqual(modifiedTeam.name, team.name)
      assert.strictEqual(modifiedTeam.motto, team.motto)
      assert.strictEqual(modifiedTeam.members.length, 0)
    })

    it('should not send an event to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),

      pusherListener.close(),
    ]))

  })

  describe('GET teams by filter', () => {

    let firstTeam: Team
    let secondTeam: Team
    let thirdTeam: Team
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlRequestMethod: string
    let accessControlRequestHeaders: string
    let response: TeamsResource.TopLevelDocument

    before(async () => {
      await MongoDB.Teams.removeAll()

      firstTeam = await MongoDB.Teams.insertRandomTeam([], 'ABCD')
      secondTeam = await MongoDB.Teams.insertRandomTeam([], 'ABEF')
      thirdTeam = await MongoDB.Teams.insertRandomTeam([], 'ABCE')

      const res = await api.get('/teams?filter[name]=ABC').end()

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

    it('should return the teams resource object self link', () => {
      assert.strictEqual(response.links.self, '/teams')
    })

    it('should return two teams', () => {
      assert.strictEqual(response.data.length, 2)
    })

    it('should return the first team', () => {
      const teamResponse = response.data[0]

      assert.strictEqual(teamResponse.type, 'teams')
      assert.strictEqual(teamResponse.id, firstTeam.teamid)
      assert.strictEqual(teamResponse.attributes.name, firstTeam.name)
      assert.strictEqual(teamResponse.attributes.motto, firstTeam.motto)
    })

    it('should return the third team', () => {
      const teamResponse = response.data[1]

      assert.strictEqual(teamResponse.type, 'teams')
      assert.strictEqual(teamResponse.id, thirdTeam.teamid)
      assert.strictEqual(teamResponse.attributes.name, thirdTeam.name)
      assert.strictEqual(teamResponse.attributes.motto, thirdTeam.motto)
    })

    after(() => Promise.all([
      MongoDB.Teams.removeByTeamId(firstTeam.teamid),
      MongoDB.Teams.removeByTeamId(secondTeam.teamid),
      MongoDB.Teams.removeByTeamId(thirdTeam.teamid),
    ]))

  })

  describe('DELETE team when no members', () => {

    let attendee: Attendee
    let team: Team
    let statusCode: number
    let contentType: string
    let body: string

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      team = await MongoDB.Teams.insertRandomTeam([], 'ABCD')

      const res = await api.delete(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send()
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text
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

    it('should delete the team', async () => {
      const result = await MongoDB.Teams.findbyTeamId(team.teamid)
      assert.strictEqual(result, null)
    })

    after(() => MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid))

  })

  describe('DELETE team when members', () => {

    let attendee: Attendee
    let team: Team
    let user: User
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()
      user = await MongoDB.Users.insertRandomUser('A')
      team = await MongoDB.Teams.insertRandomTeam([user._id], 'ABCD')

      const res = await api.delete(`/teams/${team.teamid}`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send()
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body
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
      assert.strictEqual(response.errors[0].title, 'Only empty teams can be deleted')
    })

    it('should not delete the team', async () => {
      const result = await MongoDB.Teams.findbyTeamId(team.teamid)
      assert.notStrictEqual(result, null)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Teams.removeByTeamId(team.teamid),
      MongoDB.Users.removeByUserId(user.userid),
    ]))

  })

})
