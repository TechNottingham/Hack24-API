import { Request } from 'hapi'
import { Logger } from 'pino'
import { WebClient, UsersInfoResponse } from '@slack/client'
import { PluginRegister } from '../../hapi.types'
import { AttendeeModel } from '../models'

type ValidateFuncCallback = (err: any, isValid?: boolean, credentials?: any) => void

interface CustomOptions {
  slack: WebClient,
  password: string,
}

async function validateAttendeeUser(username: string, slack: WebClient, log: Logger) {
  if (username.indexOf('@') > -1) {
    log.info(`Finding attendee with email "${username}"...`)

    // Username is an attendee email address
    const attendees = await AttendeeModel
      .find({ attendeeid: username }, '_id')
      .limit(1)
      .exec()

    if (attendees.length === 0) {
      return null
    }

    return { username }
  }

  if (!/U[A-Z0-9]{8}/.test(username)) {
    log.info(`Invalid slackid: "${username}"`)
    return null
  }

  log.info(`Finding attendee with slackid "${username}"...`)

  // Username is a Slack user ID
  const attendee = await AttendeeModel
    .findOne({ slackid: username }, '_id attendeeid')
    .exec()

  if (attendee !== null) {
    log.info(`Found attendee "${username}" to be "${attendee.attendeeid}`)
    return { username: attendee.attendeeid }
  }

  log.info(`Looking up Slack profile for attendee "${username}"...`)

  let slackUser: UsersInfoResponse
  try {
    slackUser = await slack.users.info(username)
  } catch (err) {
    log.error(`Could not look-up user "${username}" on Slack API: ${err.message}`)
    throw err
  }

  log.info(`Found "${username}" to be "${slackUser.user.profile.email}"`)

  const updateResponse = await AttendeeModel
    .findOneAndUpdate({ attendeeid: slackUser.user.profile.email }, { slackid: slackUser.user.id })
    .select('_id')
    .exec()

  if (updateResponse === null) {
    return null
  }

  return { username: slackUser.user.profile.email }
}

const register: PluginRegister = (server, options: CustomOptions, next) => {
  server.auth.strategy('attendee', 'basic', {
    realm: 'Attendee access',
    validateFunc: (request: Request, username: string, password: string, callback: ValidateFuncCallback) => {
      if (password !== options.password) {
        return callback(null, false)
      }
      validateAttendeeUser(username, options.slack, request.logger)
        .then((user) => callback(null, !!user, user || undefined))
        .catch((err) => callback(err))
    },
  })

  next()
}

register.attributes = {
  name: 'attendee-auth-strategy',
  version: '0.0.0',
}

export default register
