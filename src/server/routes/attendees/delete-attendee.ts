import { Request, IReply } from 'hapi'
import { AttendeeModel } from '../../models'
import * as Boom from '../../boom'

export default async function handler(request: Request, reply: IReply) {
  const attendeeid = request.params.attendeeId

  if (attendeeid === undefined || typeof attendeeid !== 'string' || attendeeid.length === 0) {
    reply('attendeeid was not specified').code(400)
    return
  }

  const deletedAttendee = await AttendeeModel
    .findOneAndRemove({ attendeeid: attendeeid }, { select: { _id: true } })
    .exec()

  if (deletedAttendee === null) {
    reply(Boom.notFound('Attendee not found'))
    return
  }

  reply().code(204)
}
