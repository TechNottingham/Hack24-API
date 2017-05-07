import { Request, IReply } from 'hapi'
import { AttendeeModel } from '../../models'
import * as Boom from '../../boom'

export default async function handler(request: Request, reply: IReply) {
  const { attendeeId: attendeeid } = request.params

  const deletedAttendee = await AttendeeModel
    .findOneAndRemove({ attendeeid }, { select: { _id: true } })
    .exec()

  if (deletedAttendee === null) {
    reply(Boom.notFound('Attendee not found'))
    return
  }

  reply().code(204)
}
