import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import addTeamMembers from './add-team-members'
import deleteTeamMembers from './delete-team-members'
import getTeamMembers from './get-team-members'

const multipleMembersSchema = Joi.object().keys({
  data: Joi.array().items(
    Joi.object().keys({
      id: Joi.string(),
      type: Joi.only('users'),
    }),
  ),
})

const register: PluginRegister = (server, _, next) => {

  server.route([
    {
      method: 'POST',
      path: '/teams/{teamId}/members',
      handler: {
        async: addTeamMembers,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
          payload: multipleMembersSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'DELETE',
      path: '/teams/{teamId}/members',
      handler: {
        async: deleteTeamMembers,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
          payload: multipleMembersSchema,
        },
        response: {
          emptyStatusCode: 204,
        },
      },
    }, {
      method: 'GET',
      path: '/teams/{teamId}/members',
      handler: {
        async: getTeamMembers,
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
  name: 'team-members-routes',
  version: '0.0.0',
}

export default register
