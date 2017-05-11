import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { HackResource, HacksResource } from '../../../resources'
import { createEscapedRegex } from '../../utils'

export default async function handler(req: Request, reply: IReply) {
  const query: { name?: RegExp } = {}

  if (req.query['filter[name]']) {
    query.name = createEscapedRegex(req.query['filter[name]'])
  }

  const hacks = await HackModel
    .find(query, 'hackid name')
    .sort({ hackid: 1 })
    .exec()

  const hackResponses = hacks.map((hack): HackResource.ResourceObject => ({
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
