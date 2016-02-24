"use strict";

import {Request, Response} from 'express';
import * as respond from './respond';
import {Root} from '../resources';

export function Get(req: Request, res: Response) {
  let rootResponse: Root.TopLevelDocument = {
    jsonapi: {
      version: '1.0'
    },
    links: {
      self: '/',
      teams: {
        href: '/teams'
      },
      users: {
        href: '/users'
      }
    }
  }
  respond.Send200(res, rootResponse);
};