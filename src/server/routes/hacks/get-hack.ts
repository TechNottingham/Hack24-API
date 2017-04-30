import { Request, IReply } from 'hapi'
import { HackModel } from '../../models'
import { HackResource } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(req: Request, reply: IReply) {
  const hackId = req.params.hackId

  const hack = await HackModel
    .findOne({ hackid: hackId }, 'hackid name')
    .exec()

  if (hack === null) {
    reply(Boom.notFound('Hack not found'))
    return
  }

  const hackResponse: HackResource.TopLevelDocument = {
    links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
    data: {
      type: 'hacks',
      id: hack.hackid,
      attributes: {
        name: hack.name,
      },
    },
  }

  reply(hackResponse)
}
