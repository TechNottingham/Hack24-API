import { PluginRegister } from '../../../hapi.types'
import addTeamEntries from './add-team-entries'
import deleteTeamEntries from './delete-team-entries'
import getTeamEntries from './get-team-entries'

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
      },
    }, {
      method: 'DELETE',
      path: '/teams/{teamId}/entries',
      handler: {
        async: deleteTeamEntries,
      },
      config: {
        auth: 'attendee',
      },
    }, {
      method: 'GET',
      path: '/teams/{teamId}/entries',
      handler: {
        async: getTeamEntries,
      },
      config: {
        cors: true,
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
