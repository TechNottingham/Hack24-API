import { Request, IReply } from 'hapi'
import { TeamModel } from '../../models'
import { JSONApi, HackResource, TeamEntriesRelationship } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const teamId = req.params.teamId

  const team = await TeamModel
    .findOne({ teamid: teamId }, 'teamid entries')
    .populate('entries', 'hackid name')
    .exec()

  if (team === null) {
    reply(Boom.notFound())
    return
  }

  const entries = team.entries.map((hack): JSONApi.ResourceIdentifierObject => ({
    type: 'hacks',
    id: hack.hackid,
  }))

  const includedHacks = team.entries.map((hack): HackResource.ResourceObject => ({
    links: { self: `/hacks/${hack.hackid}` },
    type: 'hacks',
    id: hack.hackid,
    attributes: { name: hack.name },
  }))

  const entriesResponse: TeamEntriesRelationship.TopLevelDocument = {
    links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
    data: entries,
    included: includedHacks,
  }

  reply(entriesResponse)
}
