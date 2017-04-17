import { create } from 'boom'
import { JSONApi } from '../resources'

const apiJsonContentType = 'application/vnd.api+json; charset=utf-8'

export function badRequest(message: string) {
  const title = 'Bad request'
  const errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '400',
      title: title,
      detail: message,
    }],
  }
  const boom = create(400, message)
  boom.name = title
  boom.output.headers['content-type'] = apiJsonContentType
  boom.output.payload = errorResponse as any
  return boom
}

export function unauthorized(message: any, scheme: string, attributes: { realm: string }) {
  const title = 'Unauthorized'
  const errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '401',
      title,
      detail: message,
    }],
  }
  const boom = create(401, message)
  boom.name = title
  boom.output.headers['content-type'] = apiJsonContentType
  boom.output.headers['WWW-Authenticate'] = `${scheme} realm="${attributes.realm}"`
  boom.output.payload = errorResponse as any
  return boom
}

export function notFound(message: any) {
  const title = 'Not Found'
  const errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '404',
      title,
      detail: message,
    }],
  }
  const boom = create(404, message)
  boom.name = title
  boom.output.headers['content-type'] = apiJsonContentType
  boom.output.payload = errorResponse as any
  return boom
}

export function conflict(message: any) {
  const title = 'Conflict'
  const errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '409',
      title,
      detail: message,
    }],
  }
  const boom = create(409, message)
  boom.name = title
  boom.output.headers['content-type'] = apiJsonContentType
  boom.output.payload = errorResponse as any
  return boom
}

export function badImplementation(message: any) {
  const title = 'Internal server error'
  const msg = message ? message.toString() : undefined
  const errorResponse: JSONApi.TopLevelDocument = {
    errors: [{
      status: '500',
      title,
      detail: msg,
    }],
  }
  const boom = create(500, message)
  boom.name = title
  boom.output.headers['content-type'] = apiJsonContentType
  boom.output.payload = errorResponse as any
  return boom
}
