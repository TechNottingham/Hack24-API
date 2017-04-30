import { Request, IReply } from 'hapi'
import * as Boom from '../../boom'
import { TeamModel } from '../../models'
import { TeamResource, UserResource, HackResource, ChallengeResource } from '../../../resources'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId

  const team = await TeamModel
    .findOne({ teamid: teamId }, 'teamid name motto members entries')
    .populate({
      path: 'members',
      select: 'userid name',
    })
    .populate({
      path: 'entries',
      select: 'hackid name challenges',
      populate: {
        path: 'challenges',
        select: 'challengeid name',
      },
    })
    .exec()

  if (team === null) {
    reply(Boom.notFound('Team not found'))
    return
  }

  const includedUsers = team.members.map<UserResource.ResourceObject>((user) => ({
    links: { self: `/users/${user.userid}` },
    type: 'users',
    id: user.userid,
    attributes: { name: user.name },
  }))

  const includedHacks = team.entries.map<HackResource.ResourceObject>((hack) => ({
    links: { self: `/hacks/${hack.hackid}` },
    type: 'hacks',
    id: hack.hackid,
    attributes: { name: hack.name },
    relationships: {
      challenges: {
        links: { self: `/hacks/${encodeURIComponent(hack.hackid)}/challenges` },
        data: hack.challenges.map((challenge) => ({ type: 'challenges', id: challenge.challengeid })),
      },
    },
  }))

  const includedChallenges = team.entries.reduce<ChallengeResource.ResourceObject[]>((previous, hack) => {
    const these = hack.challenges.map<ChallengeResource.ResourceObject>((challenge) => ({
      links: { self: `/challenges/${challenge.challengeid}` },
      type: 'challenges',
      id: challenge.challengeid,
      attributes: { name: challenge.name },
    }))
    return [...previous, ...these]
  }, [])

  const result: TeamResource.TopLevelDocument = {
    links: { self: `/teams/${encodeURIComponent(team.teamid)}` },
    data: {
      type: 'teams',
      id: team.teamid,
      attributes: {
        name: team.name,
        motto: team.motto || null,
      },
      relationships: {
        members: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
          data: team.members.map((member) => ({ type: 'users', id: member.userid })),
        },
        entries: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
          data: team.entries.map((hack) => ({ type: 'hacks', id: hack.hackid })),
        },
      },
    },
    included: [...includedUsers, ...includedHacks, ...includedChallenges],
  }

  reply(result)
}
