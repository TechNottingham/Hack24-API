import { Request, IReply } from 'hapi'
import { UserModel, TeamModel } from '../../models'
import { UserResource, UsersResource, TeamResource } from '../../../resources'

export default async function handler(_: Request, reply: IReply) {
  const users = await UserModel
    .find({}, 'userid name')
    .sort({ userid: 1 })
    .exec()

  const userObjectIds = users.map((user) => user._id)

  const teams = await TeamModel
    .find({ members: { $in: userObjectIds } }, 'teamid name motto members')
    .populate('members', 'userid')
    .exec()

  const userResponses = users.map((user) => {
    const usersTeam = teams.find((team) => team.members.some((member) => member.userid === user.userid))
    const userResponse: UserResource.ResourceObject = {
      links: { self: `/users/${encodeURIComponent(user.userid)}` },
      type: 'users',
      id: user.userid,
      attributes: { name: user.name },
      relationships: {
        team: {
          links: { self: `/users/${encodeURIComponent(user.userid)}/team` },
          data: usersTeam ? { type: 'teams', id: usersTeam.teamid } : null,
        },
      },
    }
    return userResponse
  })

  const includedTeams = teams.map<TeamResource.ResourceObject>((team) => ({
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
  }))

  const usersResponse: UsersResource.TopLevelDocument = {
    links: { self: '/users' },
    data: userResponses,
    included: includedTeams,
  }

  reply(usersResponse)
}
