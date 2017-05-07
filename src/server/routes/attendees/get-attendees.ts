import {Request, IReply} from 'hapi'
import {AttendeeModel} from '../../models'
import {AttendeeResource, AttendeesResource} from '../../../resources'

export default async function handler(_: Request, reply: IReply) {
  const attendees = await AttendeeModel
    .find({}, 'attendeeid')
    .sort({ attendeeid: 1 })
    .exec()

  const attendeesData = attendees.map<AttendeeResource.ResourceObject>((attendee) => ({
    links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
    type: 'attendees',
    id: attendee.attendeeid,
  }))

  const attendeesResponse = {
    links: { self: '/attendees' },
    data: attendeesData,
  } as AttendeesResource.TopLevelDocument

  reply(attendeesResponse)
}
