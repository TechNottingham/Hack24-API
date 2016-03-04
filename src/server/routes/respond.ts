"use strict";

import {Response} from 'express'
import {JSONApi} from '../resources'

export function Send200(res: Response, model: any) {
  res.status(200)
     .contentType('application/vnd.api+json')
     .send(model);
}

export function Send201(res: Response, model: any) {
  res.status(201)
     .contentType('application/vnd.api+json')
     .send(model);
}

export function Send204(res: Response) {
  res.status(204).end();
}

export function Send400(res: Response, title?: string) {
  let errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '400',
      title: title || 'Bad request.'
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
      detail: 'You are not permitted to perform that action.'
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