import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { HackResource, HacksResource } from '../../../resources'

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export default async function handler(req: Request, reply: IReply) {
  const query: any = {}

  if (req.query['filter[name]']) {
    query.name = new RegExp(escapeForRegex(req.query['filter[name]']), 'i')
  }

  const hacks = await HackModel
    .find(query, 'hackid name')
    .sort({ hackid: 1 })
    .exec()

  const hackResponses = hacks.map<HackResource.ResourceObject>((hack) => ({
    links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
    type: 'hacks',
    id: hack.hackid,
    attributes: {
      name: hack.name,
    },
  }))

  const hacksResponse: HacksResource.TopLevelDocument = {
    links: { self: `/hacks` },
    data: hackResponses,
  }

  reply(hacksResponse)
}
