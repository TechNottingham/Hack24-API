import { Request, IReply } from 'hapi'
import { AttendeeModel } from '../../models'
import { AttendeeResource } from '../../../resources'

export default async function handler(request: Request, reply: IReply) {
  if (request.params.attendeeId === undefined || typeof request.params.attendeeId !== 'string') {
    reply('Missing attendeeId parameter').code(400)
    return
  }

  const attendee = await AttendeeModel
    .findOne({ attendeeid: request.params.attendeeId }, 'attendeeid')
    .exec()

  if (!attendee) {
    reply('Attendee not found').code(404)
    return
  }

  const attendeeResponse = {
    links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
    data: {
      type: 'attendees',
      id: attendee.attendeeid,
    },
  } as AttendeeResource.TopLevelDocument

  reply(attendeeResponse)
}
