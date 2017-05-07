import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
import { TeamResource, TeamsResource, UserResource, HackResource, ChallengeResource, JSONApi } from '../../../resources'
import { createEscapedRegex } from '../../utils'

export default async function handler(req: Request, reply: IReply) {
  const query: any = {}

  req.logger.info('Filter: ', req.query)

  if (req.query['filter[name]']) {
    query.name = createEscapedRegex(req.query['filter[name]'])
  }

  const teams = await TeamModel
    .find(query, 'teamid name motto members entries')
    .sort({ teamid: 1 })
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

  const teamResponses = teams.map((team): TeamResource.ResourceObject => ({
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
        data: team.members.map((member) => ({ type: 'users', id: member.userid })),
      },
      entries: {
        links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
        data: team.entries.map((hack) => ({ type: 'hacks', id: hack.hackid })),
      },
    },
  }))

  const includes: JSONApi.ResourceObject[] = [].concat(...teams.map((team): JSONApi.ResourceObject[] => {
    const members = team.members.map((member): UserResource.ResourceObject => ({
      links: { self: `/users/${member.userid}` },
      type: 'users',
      id: member.userid,
      attributes: { name: member.name },
    }))

    const entries = team.entries.map((hack): HackResource.ResourceObject => ({
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

    const challenges: ChallengeResource.ResourceObject[] = [].concat(...team.entries.map((hack) => (
      hack.challenges.map((challenge): ChallengeResource.ResourceObject => ({
        links: { self: `/challenges/${challenge.challengeid}` },
        type: 'challenges',
        id: challenge.challengeid,
        attributes: { name: challenge.name },
      }))
    )))

    return [...members, ...entries, ...challenges]
  }))

  const teamsResponse: TeamsResource.TopLevelDocument = {
    links: { self: `/teams` },
    data: teamResponses,
    included: includes,
  }

  reply(teamsResponse)
}
