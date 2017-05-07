import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
import { JSONApi, UserResource, TeamMembersRelationship } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId

  const team = await TeamModel
    .findOne({ teamid: teamId }, 'teamid members')
    .populate('members', 'userid name')
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const members = team.members.map((member): JSONApi.ResourceIdentifierObject => ({
    type: 'users',
    id: member.userid,
  }))

  const includedUsers = team.members.map((member): UserResource.ResourceObject => ({
    links: { self: `/users/${member.userid}` },
    type: 'users',
    id: member.userid,
    attributes: { name: member.name },
  }))

  const membersResponse: TeamMembersRelationship.TopLevelDocument = {
    links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
    data: members,
    included: includedUsers,
  }

  reply(membersResponse)
}
