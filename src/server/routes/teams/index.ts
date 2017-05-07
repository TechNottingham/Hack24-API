import * as Joi from 'joi'
import { PluginRegister } from '../../../hapi.types'
import createTeam from './create-team'
import deleteTeam from './delete-team'
import getTeam from './get-team'
import getTeams from './get-teams'
import updateTeam from './update-team'

const multipleEntriesSchema = Joi.object().keys({
  data: Joi.array().items(
    Joi.object().keys({
      id: Joi.string(),
      type: Joi.only('hacks'),
    }),
  ),
})

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
      path: '/teams',
      handler: {
        async: createTeam,
      },
      config: {
        auth: 'attendee',
        validate: {
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('teams'),
              attributes: Joi.object().keys({
                name: Joi.string(),
                motto: Joi.string(),
              }).optionalKeys('motto'),
              relationships: Joi.object().keys({
                entries: multipleEntriesSchema,
                members: multipleMembersSchema,
              }).optionalKeys('entries', 'members'),
            }).optionalKeys('relationships'),
          }),
        },
      },
    },
    {
      method: 'DELETE',
      path: '/teams/{teamId}',
      handler: {
        async: deleteTeam,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
        },
      },
    },
    {
      method: 'GET',
      path: '/teams',
      handler: {
        async: getTeams,
      },
      config: {
        cors: true,
      },
    },
    {
      method: 'GET',
      path: '/teams/{teamId}',
      handler: {
        async: getTeam,
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
    {
      method: 'PATCH',
      path: '/teams/{teamId}',
      handler: {
        async: updateTeam,
      },
      config: {
        auth: 'attendee',
        validate: {
          params: {
            teamId: Joi.string(),
          },
          payload: Joi.object().keys({
            data: Joi.object().keys({
              id: Joi.string(),
              type: Joi.only('teams'),
              attributes: Joi.object().keys({
                name: Joi.string(),
                motto: Joi.string(),
              }).optionalKeys('name', 'motto'),
            }).optionalKeys('attributes'),
          }),
        },
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'teams-routes',
  version: '0.0.0',
}

export default register
