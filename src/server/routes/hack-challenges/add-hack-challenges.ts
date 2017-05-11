import { Request, IReply } from 'hapi'
import { HackModel, ChallengeModel } from '../../models'
import { HackChallengesRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { hackId: hackid } = req.params
  const requestDoc: HackChallengesRelationship.TopLevelDocument = req.payload

  const hack = await HackModel
    .findOne({ hackid }, 'hackid name challenges')
    .populate('challenges', 'challengeid')
    .exec()

  if (hack === null) {
    reply(Boom.notFound('Hack not found'))
    return
  }

  const challengeIdsToAdd = requestDoc.data.map((challenge) => challenge.id)
  const existingChallengeIds = challengeIdsToAdd.filter((challengeIdToAdd) => {
    return hack.challenges.some((actualchallenge) => actualchallenge.challengeid === challengeIdToAdd)
  })

  if (existingChallengeIds.length > 0) {
    reply(Boom.badRequest('One or more challenges are already challenges of this hack'))
    return
  }

  const challenges = await ChallengeModel
    .find({ challengeid: { $in: challengeIdsToAdd } }, 'challengeid name')
    .exec()

  if (challenges.length !== challengeIdsToAdd.length) {
    reply(Boom.badRequest('One or more of the specified challenges could not be found'))
    return
  }

  const challengeObjectIds = challenges.map((challenge) => challenge._id)

  const hacks = await HackModel
    .find({ challenges: { $in: challengeObjectIds } }, 'hackid')
    .exec()

  if (hacks.length > 0) {
    reply(Boom.badRequest('One or more of the specified challenges are already in a hack'))
    return
  }

  hack.challenges = hack.challenges.concat(challenges.map((challenge) => challenge._id))

  await hack.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  challenges.forEach((challenge) => {
    eventBroadcaster.trigger('hacks_update_challenges_add', {
      hackid: hack.hackid,
      name: hack.name,
      entry: {
        challengeid: challenge.challengeid,
        name: challenge.name,
      },
    }, req.logger)
  })

  reply()
}
