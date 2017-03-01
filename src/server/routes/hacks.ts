import * as respond from './respond'
import * as slug from 'slug'
import * as middleware from '../middleware'

import {HackModel, TeamModel} from '../models'
import {Request, Response, Router} from 'express'
import {MongoDBErrors} from '../models'
import {HackResource, HacksResource} from '../../resources'
import {EventBroadcaster} from '../eventbroadcaster'
import {JsonApiParser} from '../parsers'

function slugify(name: string): string {
  return slug(name, { lower: true })
}

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export class HacksRoute {
  private _eventBroadcaster: EventBroadcaster

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this)
    const router = Router()

    router.get('/:hackId', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.get))
    router.delete('/:hackId', middleware.requiresUser, middleware.requiresAttendeeUser, asyncHandler(this.delete))
    router.options('/:hackId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, asyncHandler(this.getAll))
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res))
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, asyncHandler(this.create))

    return router
  }

  public async getAll(req: Request, res: Response) {
    let query: any = {}

    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i')
    }

    const hacks = await HackModel
      .find(query, 'hackid name')
      .sort({ hackid: 1 })
      .exec()

    const hackResponses = hacks.map<HackResource.ResourceObject>((hack) => ({
      links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
      type: 'hacks',
      id: hack.hackid,
      attributes: {
        name: hack.name,
      },
    }))

    const hacksResponse: HacksResource.TopLevelDocument = {
      links: { self: `/hacks` },
      data: hackResponses,
    }

    respond.Send200(res, hacksResponse)
  }

  public async create(req: Request, res: Response) {
    const requestDoc: HackResource.TopLevelDocument = req.body

    if (!requestDoc
      || !requestDoc.data
      || requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'hacks'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string') {
      return respond.Send400(res)
    }

    const hack = new HackModel({
      hackid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      members: [],
    })

    try {
      await hack.save()
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
        return respond.Send409(res)
      }
      throw err
    }

    const hackResponse: HackResource.TopLevelDocument = {
      links: {
        self: `/hacks/${encodeURIComponent(hack.hackid)}`,
      },
      data: {
        type: 'hacks',
        id: hack.hackid,
        attributes: {
          name: hack.name,
        },
      },
    }

    this._eventBroadcaster.trigger('hacks_add', {
      hackid: hack.hackid,
      name: hack.name,
    })

    respond.Send201(res, hackResponse)
  }

  public async get(req: Request, res: Response) {
    const hackId = req.params.hackId

    const hack = await HackModel
      .findOne({ hackid: hackId }, 'hackid name')
      .exec()

    if (hack === null) {
      return respond.Send404(res)
    }

    const hackResponse: HackResource.TopLevelDocument = {
      links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
      data: {
        type: 'hacks',
        id: hack.hackid,
        attributes: {
          name: hack.name,
        },
      },
    }

    respond.Send200(res, hackResponse)
  }

  public async delete(req: Request, res: Response) {
    const hackId = req.params.hackId

    if (hackId === undefined || typeof hackId !== 'string' || hackId.length === 0) {
      return respond.Send400(res)
    }

    const hack = await HackModel.findOne({ hackid: hackId }).exec()
    if (hack === null) {
      return respond.Send404(res)
    }

    const teams = await TeamModel.findOne({ entries: hack._id }, '_id').exec()
    if (teams !== null) {
      return respond.Send400(res, 'Hack is entered into a team.')
    }

    await HackModel.remove({ _id: hack._id }).exec()
    respond.Send204(res)
  }

}
