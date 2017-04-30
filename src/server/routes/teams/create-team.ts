import { Request, IReply } from 'hapi'
import * as Boom from '../../boom'
import * as slug from 'slug'
import { UserModel, TeamModel, HackModel, MongoDBErrors } from '../../models'
import { JSONApi, TeamResource } from '../../../resources'
import EventBroadcaster from '../../eventbroadcaster'

function slugify(name: string): string {
  return slug(name, { lower: true })
}

export default async function handler(req: Request, reply: IReply) {
  const requestDoc: TeamResource.TopLevelDocument = req.payload

  if (!requestDoc
    || !requestDoc.data
    || requestDoc.data.id
    || !requestDoc.data.type
    || requestDoc.data.type !== 'teams'
    || !requestDoc.data.attributes
    || !requestDoc.data.attributes.name
    || typeof requestDoc.data.attributes.name !== 'string') {
    reply(Boom.badRequest())
    return
  }

  const relationships = requestDoc.data.relationships
  let members: JSONApi.ResourceIdentifierObject[] = []
  let entries: JSONApi.ResourceIdentifierObject[] = []

  if (relationships) {
    if (relationships.members && relationships.members.data) {
      if (!Array.isArray(relationships.members.data)) {
        reply(Boom.badRequest())
        return
      }
      members = relationships.members.data
    }

    if (relationships.entries && relationships.entries.data) {
      if (!Array.isArray(relationships.entries.data)) {
        reply(Boom.badRequest())
        return
      }
      entries = relationships.entries.data
    }
  }

  const team = new TeamModel({
    teamid: slugify(requestDoc.data.attributes.name),
    name: requestDoc.data.attributes.name,
    motto: requestDoc.data.attributes.motto || null,
    members: [],
    entries: [],
  })

  let users: UserModel[] = []
  let hacks: HackModel[] = []

  if (members.length > 0) {
    users = await UserModel.find({
      userid: {
        $in: members.map((member) => member.id.toString()),
      },
    }, '_id userid name').exec()
    team.members = users.map((user) => user._id)
  }

  if (entries.length > 0) {
    hacks = await HackModel.find({
      hackid: {
        $in: entries.map((entry) => entry.id.toString()),
      },
    }, '_id hackid name').exec()
    team.entries = hacks.map((hack) => hack._id)
  }

  try {
    await team.save()
  } catch (err) {
    if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
      reply(Boom.conflict('Team already exists'))
      return
    }
    throw err
  }

  const teamResponse: TeamResource.TopLevelDocument = {
    links: {
      self: `/teams/${encodeURIComponent(team.teamid)}`,
    },
    data: {
      type: 'teams',
      id: team.teamid,
      attributes: {
        name: team.name,
        motto: team.motto,
      },
      relationships: {
        members: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/members` },
          data: users.map((user) => ({ type: 'users', id: user.userid })),
        },
        entries: {
          links: { self: `/teams/${encodeURIComponent(team.teamid)}/entries` },
          data: hacks.map((hack) => ({ type: 'hacks', id: hack.hackid })),
        },
      },
    },
  }

  const eventBroadcaster: EventBroadcaster = req.server.app.eventBroadcaster
  eventBroadcaster.trigger('teams_add', {
    teamid: team.teamid,
    name: team.name,
    motto: team.motto,
    members: users.map((user) => ({ userid: user.userid, name: user.name })),
    entries: hacks.map((hack) => ({ hackid: hack.hackid, name: hack.name })),
  }, req.logger)

  reply(teamResponse).code(201)
}
