import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import addTeamEntries from './add-team-entries'
import deleteTeamEntries from './delete-team-entries'
import getTeamEntries from './get-team-entries'

const multipleEntriesSchema = Joi.object().keys({
  data: Joi.array().items(
    Joi.object().keys({
      id: Joi.string(),
      type: Joi.only('hacks'),
    }),
  ),
})

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/teams/{teamId}/entries',
      handler: {
        async: addTeamEntries,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
          payload: multipleEntriesSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'DELETE',
      path: '/teams/{teamId}/entries',
      handler: {
        async: deleteTeamEntries,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
          payload: multipleEntriesSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'GET',
      path: '/teams/{teamId}/entries',
      handler: {
        async: getTeamEntries,
      },
      config: {
        cors: true,
        validate: {
          params: {
            teamId: Joi.string(),
          },
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'team-entries-routes',
  version: '0.0.0',
}

export default register
