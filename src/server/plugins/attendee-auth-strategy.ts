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

const slackIdPattern = /U[A-Z0-9]{8}/

async function validateAttendeeByEmailAddress(username: string, log: Logger) {
  log.info(`Finding attendee with email "${username}"...`)

  const attendees = await AttendeeModel
    .find({ attendeeid: username }, '_id attendeeid slackid')
    .limit(1)
    .exec()

  if (attendees.length === 0) {
    return null
  }

  const attendee = attendees[0]

  return {
    attendeeid: attendee._id,
    email: attendee.attendeeid,
    slackid: attendee.slackid,
  }
}

async function validateAttendeeBySlackId(username: string, slack: WebClient, log: Logger) {
  if (!slackIdPattern.test(username)) {
    log.info(`Invalid slackid: "${username}"`)
    return null
  }

  log.info(`Finding attendee with slackid "${username}"...`)

  const attendee = await AttendeeModel
    .findOne({ slackid: username }, '_id attendeeid slackid')
    .exec()

  if (attendee !== null) {
    log.info(`Found attendee "${username}" to be "${attendee.attendeeid}`)
    return {
      attendeeid: attendee._id,
      email: attendee.attendeeid,
      slackid: attendee.slackid,
    }
  }

  log.info(`Looking up Slack profile for attendee "${username}"...`)

  let slackUser: UsersInfoResponse
  try {
    slackUser = await slack.users.info(username)
  } catch (err) {
    log.error(`Could not look-up user "${username}" on Slack API: ${err.message}`)
    return null
  }

  log.info(`Found "${username}" to be "${slackUser.user.profile.email}"`)

  const attendeeUpdate = await AttendeeModel
    .findOneAndUpdate({ attendeeid: slackUser.user.profile.email }, { slackid: slackUser.user.id })
    .select('_id')
    .exec()

  if (attendeeUpdate === null) {
    return null
  }

  return {
    attendeeid: attendeeUpdate._id,
    email: slackUser.user.profile.email,
    slackid: slackUser.user.id,
  }
}

function validateAttendeeUser(username: string, slack: WebClient, log: Logger) {
  if (username.indexOf('@') > 0) {
    return validateAttendeeByEmailAddress(username, log)
  }
  return validateAttendeeBySlackId(username, slack, log)
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
