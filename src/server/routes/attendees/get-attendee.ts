import { Request, IReply } from 'hapi'
import { AttendeeModel } from '../../models'
import { AttendeeResource } from '../../../resources'
import * as Boom from '../../boom'

export default async function handler(request: Request, reply: IReply) {
  const { attendeeId: attendeeid } = request.params

  const attendee = await AttendeeModel
    .findOne({ attendeeid }, 'attendeeid')
    .exec()

  if (!attendee) {
    reply(Boom.notFound('Attendee not found'))
    return
  }

  const attendeeResponse: AttendeeResource.TopLevelDocument = {
    links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
    data: {
      type: 'attendees',
      id: attendee.attendeeid,
    },
  }

  reply(attendeeResponse)
}
