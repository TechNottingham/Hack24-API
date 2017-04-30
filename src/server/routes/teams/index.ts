import { PluginRegister } from '../../../hapi.types'
import createTeam from './create-team'
import deleteTeam from './delete-team'
import getTeam from './get-team'
import getTeams from './get-teams'
import updateTeam from './update-team'

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
      },
    },
  ])

  next()
}

register.attributes = {
  name: 'teams-routes',
  version: '0.0.0',
}

export = register
