import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
import { TeamMembersRelationship } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'
import * as Boom from 'boom'

export default async function handler(req: Request, reply: IReply) {
  const { teamId: teamid } = req.params
  const requestDoc: TeamMembersRelationship.TopLevelDocument = req.payload

  const team = await TeamModel
    .findOne({ teamid }, 'teamid name members')
    .populate('members', 'userid name')
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const usersToDelete = team.members.filter((member) => requestDoc.data.some((memberToDelete) => member.userid === memberToDelete.id))

  if (usersToDelete.length < requestDoc.data.length) {
    reply(Boom.badRequest())
    return
  }

  const userIdsToDelete = usersToDelete.map((u) => u.userid)
  team.members = team.members.filter((member) => userIdsToDelete.indexOf(member.userid) === -1)

  await team.save()

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  usersToDelete.forEach((user) => {
    eventBroadcaster.trigger('teams_update_members_delete', {
      teamid: team.teamid,
      name: team.name,
      member: {
        userid: user.userid,
        name: user.name,
      },
    }, req.logger)
  })

  reply().code(204)
}
