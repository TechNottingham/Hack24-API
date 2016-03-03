"use strict";

import {Request, Response} from 'express'
import {IModels, MongoDBErrors} from '../models'
import * as respond from './respond';
import {AttendeeResource, AttendeesResource} from '../resources';

declare interface RequestWithModels extends Request {
  models: IModels
}

export function Get(req: RequestWithModels, res: Response) {
  if (req.params.attendeeid === undefined || typeof req.params.attendeeid !== 'string')
    return respond.Send400(res);
    
  req.models.Attendee
    .findOne({ attendeeid: req.params.attendeeid }, 'attendeeid')
    .exec()
    .then((attendee) => {
      if (!attendee)
        return respond.Send404(res);

        const attendeeResponse = <AttendeeResource.TopLevelDocument> {
          links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
          data: {
            type: 'attendees',
            id: attendee.attendeeid
          }
        };

        res.status(200).contentType('application/vnd.api+json').send(attendeeResponse);
    }, respond.Send500.bind(null, res));
};

export function GetAll(req: RequestWithModels, res: Response) {
  
  req.models.Attendee
    .find({}, 'attendeeid')
    .sort({ attendeeid: 1 })
    .exec()
    .then((attendees) => {
      
      const attendeesData = attendees.map<AttendeeResource.ResourceObject>((attendee) => ({
        links: { self: `/attendees/${encodeURIComponent(attendee.attendeeid)}` },
        type: 'attendees',
        id: attendee.attendeeid
      }));
      
      const attendeesResponse = <AttendeesResource.TopLevelDocument> {
        links: {
          self: '/attendees'
        },
        data: attendeesData
      }
      
      respond.Send200(res, attendeesResponse);
    }, respond.Send500.bind(null, res));
};

export function Create(req: RequestWithModels, res: Response) {
  const requestDoc: AttendeeResource.TopLevelDocument = req.body;
  
  if (!requestDoc 
    || !requestDoc.data
    || !requestDoc.data.id
    || typeof requestDoc.data.id !== 'string'
    || !requestDoc.data.type
    || requestDoc.data.type !== 'attendees')
    return respond.Send400(res);

  const attendee = new req.models.Attendee({
    attendeeid: requestDoc.data.id
  });

  attendee.save((err) => {
    if (err) {
      if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
        return respond.Send409(res);

      return respond.Send500(res);
    }

    const attendeeResponse = <AttendeeResource.TopLevelDocument> {
      links: {
        self: `/attendees/${encodeURIComponent(attendee.attendeeid)}`
      },
      data: {
        type: 'attendees',
        id: attendee.attendeeid
      }
    };

    respond.Send201(res, attendeeResponse);
  });
};

export function Delete(req: RequestWithModels, res: Response) {
  const attendeeid = req.params.attendeeid;
  
  if (attendeeid === undefined || typeof attendeeid !== 'string' || attendeeid.length === 0)
    return respond.Send400(res);
    
  req.models.Attendee
    .findOneAndRemove({ attendeeid: attendeeid })
    .exec()
    .then((removedAttendee) => {
      respond.Send204(res);
    }, respond.Send500.bind(null, res));
};
