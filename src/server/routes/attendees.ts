import * as respond from './respond';
import * as middleware from '../middleware';

import {AttendeeModel} from '../models';
import {Request, Response, Router} from 'express';
import {MongoDBErrors} from '../models';
import {AttendeeResource, AttendeesResource} from '../../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

export class AttendeesRoute {
  private _eventBroadcaster: EventBroadcaster;

  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }

  public createRouter() {
    const asyncHandler = middleware.AsyncHandler.bind(this);
    const router = Router();

    router.get('/:attendeeId', middleware.requiresUser, middleware.requiresAdminUser, asyncHandler(this.get));
    router.delete('/:attendeeId', middleware.requiresUser, middleware.requiresAdminUser, asyncHandler(this.delete));
    router.get('/', middleware.requiresUser, middleware.requiresAdminUser, asyncHandler(this.getAll));
    router.post('/', middleware.requiresUser, middleware.requiresAdminUser, JsonApiParser, asyncHandler(this.create));

    return router;
  }

  public async get(req: Request, res: Response) {
    if (req.params.attendeeId === undefined || typeof req.params.attendeeId !== 'string') {
      return respond.Send400(res);
    }

    const attendee = await AttendeeModel
      .findOne({ attendeeid: req.params.attendeeId }, 'attendeeid')
      .exec();

    if (!attendee) {
      return respond.Send404(res);
    }

    const attendeeResponse = <AttendeeResource.TopLevelDocument> {
      links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
      data: {
        type: 'attendees',
        id: attendee.attendeeid,
      },
    };

    res.status(200).contentType('application/vnd.api+json').send(attendeeResponse);
  }

  public async getAll(_: Request, res: Response) {

    const attendees = await AttendeeModel
      .find({}, 'attendeeid')
      .sort({ attendeeid: 1 })
      .exec();

    const attendeesData = attendees.map<AttendeeResource.ResourceObject>((attendee) => ({
      links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
      type: 'attendees',
      id: attendee.attendeeid,
    }));

    const attendeesResponse = <AttendeesResource.TopLevelDocument> {
      links: {
        self: '/attendees',
      },
      data: attendeesData,
    };

    respond.Send200(res, attendeesResponse);
  }

  public async create(req: Request, res: Response) {
    const requestDoc: AttendeeResource.TopLevelDocument = req.body;

    if (!requestDoc
      || !requestDoc.data
      || !requestDoc.data.id
      || typeof requestDoc.data.id !== 'string'
      || !requestDoc.data.type
      || requestDoc.data.type !== 'attendees') {
      return respond.Send400(res);
    }

    const attendee = new AttendeeModel({
      attendeeid: requestDoc.data.id,
    });

    try {
      await attendee.save();
    } catch (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY) {
        return respond.Send409(res);
      }
      throw err;
    }

    const attendeeResponse = <AttendeeResource.TopLevelDocument> {
      links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
      data: {
        type: 'attendees',
        id: attendee.attendeeid,
      },
    };

    respond.Send201(res, attendeeResponse);
  }

  public async delete(req: Request, res: Response) {
    const attendeeid = req.params.attendeeId;

    if (attendeeid === undefined || typeof attendeeid !== 'string' || attendeeid.length === 0) {
      return respond.Send400(res);
    }

    const deletedAttendee = await AttendeeModel
      .findOneAndRemove({ attendeeid: attendeeid }, { select: '_id' })
      .exec();

    if (deletedAttendee === null) {
      return respond.Send404(res);
    }

    respond.Send204(res);
  }

}
