"use strict";

import * as respond from './respond';
import * as slug from 'slug';
import * as middleware from '../middleware';

import {Log} from '../logger';
import {UserModel, HackModel} from '../models';
import {Request, Response, Router} from 'express';
import {IHackModel, MongoDBErrors} from '../models';
import {JSONApi, HackResource, HacksResource, UserResource} from '../resources';
import {EventBroadcaster} from '../eventbroadcaster';
import {JsonApiParser} from '../parsers';

function slugify(name: string): string {
  return slug(name, { lower: true });
}

function escapeForRegex(str: string): string {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export class HacksRoute {
  private _eventBroadcaster: EventBroadcaster;
  
  constructor(eventBroadcaster: EventBroadcaster) {
    this._eventBroadcaster = eventBroadcaster;
  }
  
  createRouter() {
    const router = Router();
    router.get('/:hackId', middleware.allowAllOriginsWithGetAndHeaders, this.get.bind(this));
    router.options('/:hackId', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.get('/', middleware.allowAllOriginsWithGetAndHeaders, this.getAll.bind(this));
    router.options('/', middleware.allowAllOriginsWithGetAndHeaders, (_, res) => respond.Send204(res));
    router.post('/', middleware.requiresUser, middleware.requiresAttendeeUser, JsonApiParser, this.create.bind(this));
    
    return router;
  }

  getAll(req: Request, res: Response) {
    let query: any = {};
    
    if (req.query.filter && req.query.filter.name) {
      query.name = new RegExp(escapeForRegex(req.query.filter.name), 'i');
    }
    
    HackModel
      .find(query, 'hackid name')
      .sort({ hackid: 1 })
      .exec()
      .then((hacks) => {
        
        const hackResponses = hacks.map<HackResource.ResourceObject>((hack) => ({
          links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
          type: 'hacks',
          id: hack.hackid,
          attributes: {
            name: hack.name
          }
        }));
        
        HackModel
          .count({})
          .exec()
          .then((totalCount) => {
            
            const hacksResponse: HacksResource.TopLevelDocument = {
              links: { self: `/hacks` },
              data: hackResponses
            };
            respond.Send200(res, hacksResponse);
            
          }, respond.Send500.bind(null, res));
      }, respond.Send500.bind(null, res));
  }
  
  create(req: Request, res: Response) {
    const requestDoc: HackResource.TopLevelDocument = req.body;
    
    if (!requestDoc 
      || !requestDoc.data
      || requestDoc.data.id
      || !requestDoc.data.type
      || requestDoc.data.type !== 'hacks'
      || !requestDoc.data.attributes
      || !requestDoc.data.attributes.name
      || typeof requestDoc.data.attributes.name !== 'string')
      return respond.Send400(res);
      
    const hack = new HackModel({
      hackid: slugify(requestDoc.data.attributes.name),
      name: requestDoc.data.attributes.name,
      members: []
    });
    
    return hack.save((err, result) => {
      if (err) {
        if (err.code === MongoDBErrors.E11000_DUPLICATE_KEY)
          return respond.Send409(res);
        return respond.Send500(res, err);
      }
      
      const hackResponse: HackResource.TopLevelDocument = {
        links: {
          self: `/hacks/${encodeURIComponent(hack.hackid)}`
        },
        data: {
          type: 'hacks',
          id: hack.hackid,
          attributes: {
            name: hack.name
          }
        }
      };
        
      this._eventBroadcaster.trigger('hacks_add', {
        hackid: hack.hackid,
        name: hack.name
      });
      
      respond.Send201(res, hackResponse);
    });
  }

  get(req: Request, res: Response) {
    const hackId = req.params.hackId;
    
    HackModel
      .findOne({ hackid: hackId }, 'hackid name')
      .exec()
      .then((hack) => {
        if (hack === null)
          return respond.Send404(res);
          
        const hackResponse: HackResource.TopLevelDocument = {
          links: { self: `/hacks/${encodeURIComponent(hack.hackid)}` },
          data: {
            type: 'hacks',
            id: hack.hackid,
            attributes: {
              name: hack.name
            }
          }
        };
        respond.Send200(res, hackResponse);
      }, respond.Send500.bind(null, res));
  }
  
}
