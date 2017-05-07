import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { HackChallengesRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { hackId: hackid } = req.params
  const requestDoc: HackChallengesRelationship.TopLevelDocument = req.payload

  const hack = await HackModel
    .findOne({ hackid }, 'hackid name challenges')
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
    }, req.logger)
  })

  reply().code(204)
}
