"use strict";

import {Response} from 'express'
import {JSONApi} from '../resources'

export function Send400(res: Response) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '400',
      title: 'Bad request.'
    }]
  };
  res.status(400)
     .contentType('application/vnd.api+json')
     .send(errorResponse);
}

export function Send401(res: Response) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '401',
      title: 'Unauthorized.',
      detail: 'An authentication header is required.'
    }]
  };
  res.status(401)
     .contentType('application/vnd.api+json')
     .header('WWW-Authenticate', 'Basic realm="api.hack24.co.uk"')
     .send(errorResponse);
}

export function Send403(res: Response) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '403',
      title: 'Access is forbidden.',
      detail: 'Only hackbot has access to do that.'
    }]
  };
  res.status(403)
     .contentType('application/vnd.api+json')
     .send(errorResponse);
}

export function Send404(res: Response) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '404',
      title: 'Resource not found.'
    }]
  };
  res.status(404)
     .contentType('application/vnd.api+json')
     .send(errorResponse);
}

export function Send409(res: Response) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '409',
      title: 'Resource ID already exists.'
    }]
  };
  res.status(409)
     .contentType('application/vnd.api+json')
     .send(errorResponse);
}

export function Send500(res: Response, err?: Error) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '500',
      title: 'Internal server error.',
      detail: err && err.message ? err.message : undefined
    }]
  };
  res.status(500)
     .contentType('application/vnd.api+json')
     .send(errorResponse);
}