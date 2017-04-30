import { PluginRegister } from '../../../hapi.types'
import addTeamMembers from './add-team-members'
import deleteTeamMembers from './delete-team-members'
import getTeamMembers from './get-team-members'

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
      },
    }, {
      method: 'DELETE',
      path: '/teams/{teamId}/members',
      handler: {
        async: deleteTeamMembers,
      },
      config: {
        auth: 'attendee',
      },
    }, {
      method: 'GET',
      path: '/teams/{teamId}/members',
      handler: {
        async: getTeamMembers,
      },
      config: {
        cors: true,
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
