import { Request, IReply } from 'hapi'
import { MongoDBErrors } from '../../models'
import { Attendee, AttendeeModel } from '../../models'
import { AttendeeResource } from '../../../resources'
import * as Boom from 'boom'

export default async function handler(request: Request, reply: IReply) {
  const requestDoc: AttendeeResource.TopLevelDocument = request.payload

  const attendee = new AttendeeModel({
    attendeeid: requestDoc.data.id,
  } as Attendee)

  try {
    await attendee.save()
  } catch (err) {
    if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
      reply(Boom.conflict('Attendee already exists'))
      return
    }
    throw err
  }

  const attendeeResponse: AttendeeResource.TopLevelDocument = {
    links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
    data: {
      type: 'attendees',
      id: attendee.attendeeid,
    },
  }

  reply(attendeeResponse).code(201)
}
