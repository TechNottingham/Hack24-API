import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import createAttendee from './create-attendee'
import deleteAttendee from './delete-attendee'
import getAttendee from './get-attendee'
import getAttendees from './get-attendees'

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/attendees',
      handler: {
        async: createAttendee,
      },
      config: {
        auth: 'admin',
        validate: {
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('attendees'),
            }),
          }),
        },
      },
    }, {
      method: 'DELETE',
      path: '/attendees/{attendeeId}',
      handler: {
        async: deleteAttendee,
      },
      config: {
        auth: 'admin',
        validate: {
          params: {
            attendeeId: Joi.string(),
          },
        },
      },
    }, {
      method: 'GET',
      path: '/attendees',
      handler: {
        async: getAttendees,
      },
      config: {
        auth: 'admin',
      },
    }, {
      method: 'GET',
      path: '/attendees/{attendeeId}',
      handler: {
        async: getAttendee,
      },
      config: {
        auth: 'admin',
        validate: {
          params: {
            attendeeId: Joi.string(),
          },
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'attendees-routes',
  version: '0.0.0',
}

export default register
