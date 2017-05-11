import * as assert from 'assert'
import { MongoDB } from './utils/mongodb'
import { Hack } from './models/hacks'
import { Challenge } from './models/challenges'
import { Attendee } from './models/attendees'
import { ApiServer } from './utils/apiserver'
import * as request from 'supertest'
import { JSONApi, HackChallengesRelationship, ChallengeResource } from '../resources'
import { PusherListener } from './utils/pusherlistener'
import { Random } from './utils/random'

describe('Hack Entries relationship', () => {

  let api: request.SuperTest<request.Test>

  before(() => {
    api = request(`http://localhost:${ApiServer.Port}`)
  })

  describe('OPTIONS hack challenges', () => {

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
      const hack = MongoDB.Hacks.createRandomHack()

      origin = Random.str()

      const res = await api.options(`/hacks/${hack.hackid}/challenges`)
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

  describe('GET hack challenges', () => {

    let origin: string
    let firstChallenge: Challenge
    let secondChallenge: Challenge
    let thirdChallenge: Challenge
    let hack: Hack
    let statusCode: number
    let contentType: string
    let accessControlAllowOrigin: string
    let accessControlExposeHeaders: string
    let response: HackChallengesRelationship.TopLevelDocument

    before(async () => {
      origin = Random.str()

      firstChallenge = await MongoDB.Challenges.insertRandomChallenge('A')
      secondChallenge = await MongoDB.Challenges.insertRandomChallenge('B')
      thirdChallenge = await MongoDB.Challenges.insertRandomChallenge('C')

      hack = MongoDB.Hacks.createRandomHack()
      hack.challenges = [firstChallenge._id, secondChallenge._id, thirdChallenge._id]
      await MongoDB.Hacks.insertHack(hack)

      const res = await api.get(`/hacks/${hack.hackid}/challenges`)
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

    it('should return the hack challenges self link', () => {
      assert.strictEqual(response.links.self, `/hacks/${hack.hackid}/challenges`)
    })

    it('should return each entry', () => {
      assert.strictEqual(response.data[0].type, 'challenges')
      assert.strictEqual(response.data[0].id, firstChallenge.challengeid)

      assert.strictEqual(response.data[1].type, 'challenges')
      assert.strictEqual(response.data[1].id, secondChallenge.challengeid)

      assert.strictEqual(response.data[2].type, 'challenges')
      assert.strictEqual(response.data[2].id, thirdChallenge.challengeid)
    })

    it('should include each expected challenge', () => {
      const challenges = response.included as ChallengeResource.ResourceObject[]

      assert.strictEqual(challenges[0].links.self, `/challenges/${firstChallenge.challengeid}`)
      assert.strictEqual(challenges[0].id, firstChallenge.challengeid)
      assert.strictEqual(challenges[0].attributes.name, firstChallenge.name)

      assert.strictEqual(challenges[1].links.self, `/challenges/${secondChallenge.challengeid}`)
      assert.strictEqual(challenges[1].id, secondChallenge.challengeid)
      assert.strictEqual(challenges[1].attributes.name, secondChallenge.name)

      assert.strictEqual(challenges[2].links.self, `/challenges/${thirdChallenge.challengeid}`)
      assert.strictEqual(challenges[2].id, thirdChallenge.challengeid)
      assert.strictEqual(challenges[2].attributes.name, thirdChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Challenges.removeByChallengeId(firstChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(thirdChallenge.challengeid),
      MongoDB.Hacks.removeByHackId(hack.hackid),
    ]))

  })

  describe('DELETE multiple hack challenges', () => {

    let attendee: Attendee
    let firstChallenge: Challenge
    let secondChallenge: Challenge
    let thirdChallenge: Challenge
    let hack: Hack
    let modifiedHack: Hack
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      firstChallenge = await MongoDB.Challenges.insertRandomChallenge('A')
      secondChallenge = await MongoDB.Challenges.insertRandomChallenge('B')
      thirdChallenge = await MongoDB.Challenges.insertRandomChallenge('C')

      hack = MongoDB.Hacks.createRandomHack()
      hack.challenges = [firstChallenge._id, secondChallenge._id, thirdChallenge._id]
      await MongoDB.Hacks.insertHack(hack)

      const req: HackChallengesRelationship.TopLevelDocument = {
        data: [{
          type: 'challenges',
          id: firstChallenge.challengeid,
        }, {
          type: 'challenges',
          id: thirdChallenge.challengeid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.delete(`/hacks/${hack.hackid}/challenges`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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

    it('should have removed the two challenges from the hack', () => {
      assert.strictEqual(modifiedHack.challenges.length, 1)
      assert.strictEqual(modifiedHack.challenges[0].equals(secondChallenge._id), true)
    })

    it('should send two hacks_update_challenges_delete events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2)
    })

    it('should send a hacks_update_challenges_delete event for the first hack entry', () => {
      const event = pusherListener.getEvent((ev) => ev.data.entry.challengeid === firstChallenge.challengeid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'hacks_update_challenges_delete')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.hackid, hack.hackid)
      assert.strictEqual(data.name, hack.name)
      assert.strictEqual(data.entry.name, firstChallenge.name)
    })

    it('should send a hacks_update_challenges_delete event for the third hack entry', () => {
      const event = pusherListener.getEvent((ev) => ev.data.entry.challengeid === thirdChallenge.challengeid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'hacks_update_challenges_delete')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.hackid, hack.hackid)
      assert.strictEqual(data.name, hack.name)
      assert.strictEqual(data.entry.name, thirdChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Challenges.removeByChallengeId(firstChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(thirdChallenge.challengeid),

      MongoDB.Hacks.removeByHackId(hack.hackid),

      pusherListener.close(),
    ]))

  })

  describe("DELETE hack challenges which don't exist", () => {

    let attendee: Attendee
    let challenge: Challenge
    let hack: Hack
    let modifiedHack: Hack
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      challenge = await MongoDB.Challenges.insertRandomChallenge()
      hack = MongoDB.Hacks.createRandomHack()
      hack.challenges = [challenge._id]
      await MongoDB.Hacks.insertHack(hack)

      const req: HackChallengesRelationship.TopLevelDocument = {
        data: [{
          type: 'challenges',
          id: challenge.challengeid,
        }, {
          type: 'challenges',
          id: 'does not exist',
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.delete(`/hacks/${hack.hackid}/challenges`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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
      assert.strictEqual(response.errors[0].detail, undefined)
    })

    it('should not modify the hack', () => {
      assert.strictEqual(modifiedHack.challenges.length, 1)
      assert.strictEqual(modifiedHack.challenges[0].equals(challenge._id), true)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Challenges.removeByChallengeId(challenge.challengeid),
      MongoDB.Hacks.removeByHackId(hack.hackid),
      pusherListener.close(),
    ]))

  })

  describe('POST hack challenges', () => {

    let attendee: Attendee
    let challenge: Challenge
    let firstNewChallenge: Challenge
    let secondNewChallenge: Challenge
    let hack: Hack
    let modifiedHack: Hack
    let statusCode: number
    let contentType: string
    let body: string
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      challenge = await MongoDB.Challenges.insertRandomChallenge('A')
      firstNewChallenge = await MongoDB.Challenges.insertRandomChallenge('B')
      secondNewChallenge = await MongoDB.Challenges.insertRandomChallenge('C')

      hack = MongoDB.Hacks.createRandomHack()
      hack.challenges = [challenge._id]
      await MongoDB.Hacks.insertHack(hack)

      const req: HackChallengesRelationship.TopLevelDocument = {
        data: [{
          type: 'challenges',
          id: firstNewChallenge.challengeid,
        }, {
          type: 'challenges',
          id: secondNewChallenge.challengeid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/hacks/${hack.hackid}/challenges`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      body = res.text

      modifiedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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

    it('should have added the new challenge to the hack', () => {
      assert.strictEqual(modifiedHack.challenges.length, 3)
      assert.strictEqual(modifiedHack.challenges[0].equals(challenge._id), true)
      assert.strictEqual(modifiedHack.challenges[1].equals(firstNewChallenge._id), true)
      assert.strictEqual(modifiedHack.challenges[2].equals(secondNewChallenge._id), true)
    })

    it('should send two hacks_update_challenges_add events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 2)
    })

    it('should send a hacks_update_challenges_add event for the first new hack entry', () => {
      const event = pusherListener.getEvent((ev) => ev.data.entry.challengeid === firstNewChallenge.challengeid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'hacks_update_challenges_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.hackid, hack.hackid)
      assert.strictEqual(data.name, hack.name)
      assert.strictEqual(data.entry.name, firstNewChallenge.name)
    })

    it('should send a hacks_update_challenges_add event for the second new hack entry', () => {
      const event = pusherListener.getEvent((ev) => ev.data.entry.challengeid === secondNewChallenge.challengeid)
      assert.strictEqual(event.appId, ApiServer.PusherAppId)
      assert.strictEqual(event.contentType, 'application/json')
      assert.strictEqual(event.payload.channels[0], 'api_events')
      assert.strictEqual(event.payload.name, 'hacks_update_challenges_add')

      const data = JSON.parse(event.payload.data)
      assert.strictEqual(data.hackid, hack.hackid)
      assert.strictEqual(data.name, hack.name)
      assert.strictEqual(data.entry.name, secondNewChallenge.name)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Challenges.removeByChallengeId(challenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(firstNewChallenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(secondNewChallenge.challengeid),

      MongoDB.Hacks.removeByHackId(hack.hackid),

      pusherListener.close(),
    ]))

  })

  describe('POST hack challenges already in a hack', () => {

    let attendee: Attendee
    let challenge: Challenge
    let otherChallenge: Challenge
    let hack: Hack
    let otherHack: Hack
    let modifiedHack: Hack
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      challenge = await MongoDB.Challenges.insertRandomChallenge()
      otherChallenge = await MongoDB.Challenges.insertRandomChallenge()

      hack = await MongoDB.Hacks.createRandomHack()
      hack.challenges = [challenge._id]
      await MongoDB.Hacks.insertHack(hack)
      otherHack = await MongoDB.Hacks.createRandomHack()
      otherHack.challenges = [otherChallenge._id]
      await MongoDB.Hacks.insertHack(otherHack)

      const req: HackChallengesRelationship.TopLevelDocument = {
        data: [{
          type: 'challenges',
          id: otherChallenge.challengeid,
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/hacks/${hack.hackid}/challenges`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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
      assert.strictEqual(response.errors[0].detail, 'One or more of the specified challenges are already in a hack')
    })

    it('should not modify the hack', () => {
      assert.strictEqual(modifiedHack.challenges.length, 1)
      assert.strictEqual(modifiedHack.challenges[0].equals(challenge._id), true)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),

      MongoDB.Challenges.removeByChallengeId(challenge.challengeid),
      MongoDB.Challenges.removeByChallengeId(otherChallenge.challengeid),

      MongoDB.Hacks.removeByHackId(hack.hackid),
      MongoDB.Hacks.removeByHackId(otherHack.hackid),

      pusherListener.close(),
    ]))

  })

  describe('POST hack challenges which do not exist', () => {

    let attendee: Attendee
    let hack: Hack
    let modifiedHack: Hack
    let statusCode: number
    let contentType: string
    let response: JSONApi.TopLevelDocument
    let pusherListener: PusherListener

    before(async () => {
      attendee = await MongoDB.Attendees.insertRandomAttendee()

      hack = await MongoDB.Hacks.insertRandomHack()

      const req: HackChallengesRelationship.TopLevelDocument = {
        data: [{
          type: 'challenges',
          id: 'does not exist',
        }],
      }

      pusherListener = await PusherListener.Create(ApiServer.PusherPort)

      const res = await api.post(`/hacks/${hack.hackid}/challenges`)
        .auth(attendee.attendeeid, ApiServer.HackbotPassword)
        .type('application/vnd.api+json')
        .send(req)
        .end()

      statusCode = res.status
      contentType = res.header['content-type']
      response = res.body

      modifiedHack = await MongoDB.Hacks.findByHackId(hack.hackid)
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
      assert.strictEqual(response.errors[0].detail, 'One or more of the specified challenges could not be found')
    })

    it('should not modify the hack', () => {
      assert.strictEqual(modifiedHack.challenges.length, 0)
    })

    it('should not send any events to Pusher', () => {
      assert.strictEqual(pusherListener.events.length, 0)
    })

    after(() => Promise.all([
      MongoDB.Attendees.removeByAttendeeId(attendee.attendeeid),
      MongoDB.Hacks.removeByHackId(hack.hackid),

      pusherListener.close(),
    ]))

  })

})
