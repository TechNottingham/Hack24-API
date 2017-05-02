import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { HackChallengesRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const hackId = req.params.hackId
  const requestDoc: HackChallengesRelationship.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || (requestDoc.data !== null && !Array.isArray(requestDoc.data))) {
    reply(Boom.badRequest())
    return
  }

  const errorCases = requestDoc.data.filter((challenge) => challenge.type !== 'challenges' || typeof challenge.id !== 'string')
  if (errorCases.length > 0) {
    reply(Boom.badRequest())
    return
  }

  const hack = await HackModel
    .findOne({ hackid: hackId }, 'hackid name challenges')
    .populate('challenges', 'challengeid name')
    .exec()

  if (hack === null) {
    reply(Boom.notFound('Hack not found'))
    return
  }

  const challengesToDelete = hack.challenges.filter((challenge) => {
    return requestDoc.data.some((challengeToDelete) => challenge.challengeid === challengeToDelete.id)
  })

  if (challengesToDelete.length < requestDoc.data.length) {
    reply(Boom.badRequest())
    return
  }

  const challengeIdsToDelete = challengesToDelete.map((challenge) => challenge.challengeid)
  hack.challenges = hack.challenges.filter((challenge) => challengeIdsToDelete.indexOf(challenge.challengeid) === -1)

  await hack.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  challengesToDelete.forEach((challenge) => {
    eventBroadcaster.trigger('hacks_update_challenges_delete', {
      hackid: hack.hackid,
      name: hack.name,
      entry: {
        challengeid: challenge.challengeid,
        name: challenge.name,
      },
    })
  })

  reply().code(204)
}
