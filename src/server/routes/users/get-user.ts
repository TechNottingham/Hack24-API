import { Request, IReply } from 'hapi'
import { UserModel, TeamModel } from '../../models'
import { UserResource, TeamResource } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  if (req.params.userId === undefined || typeof req.params.userId !== 'string') {
    reply(Boom.badRequest())
    return
  }

  const user = await UserModel
    .findOne({ userid: req.params.userId }, 'userid name')
    .exec()

  if (!user) {
    reply(Boom.notFound('User not found'))
    return
  }

  const team = await TeamModel
    .findOne({ members: { $in: [user._id] } }, 'teamid name members motto')
    .populate('members', 'userid name')
    .exec()

  const userResponse = {
    links: { self: `/users/${encodeURIComponent(user.userid)}` },
    data: {
      type: 'users',
      id: user.userid,
      attributes: { name: user.name },
      relationships: {
        team: {
          links: { self: `/users/${encodeURIComponent(user.userid)}/team` },
          data: null,
        },
      },
    },
  } as UserResource.TopLevelDocument

  if (team) {
    userResponse.data.relationships.team.data = { type: 'teams', id: team.teamid }

    const includedTeam = {
      links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
      type: 'teams',
      id: team.teamid,
      attributes: {
        name: team.name,
        motto: team.motto || null,
      },
      relationships: {
        members: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
          data: team.members ? team.members.map((member) => ({ type: 'users', id: member.userid })) : [],
        },
        entries: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
          data: null,
        },
      },
    } as TeamResource.ResourceObject

    const includedUsers = team.members
      .filter((member) => member.userid !== user.userid)
      .map<UserResource.ResourceObject>((member) => ({
        links: { self: `/users/${encodeURIComponent(member.userid)}` },
        type: 'users',
        id: member.userid,
        attributes: { name: member.name },
        relationships: {
          team: {
            links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
            data: { type: 'teams', id: team.teamid },
          },
        },
      }))

    userResponse.included = [includedTeam, ...includedUsers]
  }

  reply(userResponse)
}
