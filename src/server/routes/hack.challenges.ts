import * as respond from './respond'
import * as middleware from '../middleware'

import {ChallengeModel, HackModel} from '../models'
import {Request, Response, Router} from 'express'
import {JSONApi, HackChallengesRelationship, ChallengeResource} from '../../resources'
import {EventBroadcaster} from '../eventbroadcaster'
import {JsonApiParser} from '../parsers'

export class HackChallengesRoute {
  private _eventBroadcaster: EventBroadcaster

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this)
    const router = Router()

    router.post('/:hackId/challenges', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.add))
    router.delete('/:hackId/challenges', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.delete))
    router.get('/:hackId/challenges', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get))
    router.options('/:hackId/challenges', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))

    return router
  }

  public async get(req: Request, res: Response) {
    const hackId = req.params.hackId

    const hack = await HackModel
      .findOne({ hackid: hackId }, 'hackid challenges')
      .populate('challenges', 'challengeid name')
      .exec()

    if (hack === null) {
      return respond.Send404(res)
    }

    const challenges = hack.challenges.map<JSONApi.ResourceIdentifierObject>((challenge) => ({
      type: 'challenges',
      id: challenge.challengeid,
    }))

    const includedChallenges = hack.challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
      links: { self: `/challenges/${challenge.challengeid}` },
      type: 'challenges',
      id: challenge.challengeid,
      attributes: { name: challenge.name },
    }))

    const challengesResponse: HackChallengesRelationship.TopLevelDocument = {
      links: { self: `/hacks/${encodeURIComponent(hack.hackid)}/challenges` },
      data: challenges,
      included: includedChallenges,
    }

    respond.Send200(res, challengesResponse)
  };

  public async delete(req: Request, res: Response) {
    const hackId = req.params.hackId
    const requestDoc: HackChallengesRelationship.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res)
    }

    const errorCases = requestDoc.data.filter((challenge) => challenge.type !== 'challenges' || typeof challenge.id !== 'string')
    if (errorCases.length > 0) {
      return respond.Send400(res)
    }

    const hack = await HackModel
      .findOne({ hackid: hackId }, 'hackid name challenges')
      .populate('challenges', 'challengeid name')
      .exec()

    if (hack === null) {
      return respond.Send404(res)
    }

    const challengesToDelete = hack.challenges.filter((challenge) => {
      return requestDoc.data.some((challengeToDelete) => challenge.challengeid === challengeToDelete.id)
    })

    if (challengesToDelete.length < requestDoc.data.length) {
      return respond.Send400(res)
    }

    const challengeIdsToDelete = challengesToDelete.map((challenge) => challenge.challengeid)
    hack.challenges = hack.challenges.filter((challenge) => challengeIdsToDelete.indexOf(challenge.challengeid) === -1)

    await hack.save()

    challengesToDelete.forEach((challenge) => {
      this._eventBroadcaster.trigger('hacks_update_challenges_delete', {
        hackid: hack.hackid,
        name: hack.name,
        entry: {
          challengeid: challenge.challengeid,
          name: challenge.name,
        },
      })
    })

    respond.Send204(res)
  };

  public async add(req: Request, res: Response) {
    const hackId = req.params.hackId
    const requestDoc: HackChallengesRelationship.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
      return respond.Send400(res)
    }

    const errorCases = requestDoc.data.filter((challenge) => challenge.type !== 'challenges' || typeof challenge.id !== 'string')
    if (errorCases.length > 0) {
      return respond.Send400(res)
    }

    const hack = await HackModel
      .findOne({ hackid: hackId }, 'hackid name challenges')
      .populate('challenges', 'challengeid')
      .exec()

    if (hack === null) {
      return respond.Send404(res)
    }

    const challengeIdsToAdd = requestDoc.data.map((challenge) => challenge.id)
    const existingChallengeIds = challengeIdsToAdd.filter((challengeIdToAdd) => {
      return hack.challenges.some((actualchallenge) => actualchallenge.challengeid === challengeIdToAdd)
    })

    if (existingChallengeIds.length > 0) {
      return respond.Send400(res, 'One or more challenges are already challenges of this hack.')
    }

    const challenges = await ChallengeModel
      .find({ challengeid: { $in: challengeIdsToAdd } }, 'challengeid name')
      .exec()

    if (challenges.length !== challengeIdsToAdd.length) {
      return respond.Send400(res, 'One or more of the specified challenges could not be found.')
    }

    const challengeObjectIds = challenges.map((challenge) => challenge._id)

    const hacks = await HackModel
      .find({ challenges: { $in: challengeObjectIds } }, 'hackid')
      .exec()

    if (hacks.length > 0) {
      return respond.Send400(res, 'One or more of the specified challenges are already in a hack.')
    }

    hack.challenges = hack.challenges.concat(challenges.map((challenge) => challenge._id))

    await hack.save()

    challenges.forEach((challenge) => {
      this._eventBroadcaster.trigger('hacks_update_challenges_add', {
        hackid: hack.hackid,
        name: hack.name,
        entry: {
          challengeid: challenge.challengeid,
          name: challenge.name,
        },
      })
    })

    respond.Send204(res)
  }

}
