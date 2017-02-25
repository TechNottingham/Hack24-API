import {json as parser} from 'body-parser'

export const JsonApiParser = parser({ type: 'application/vnd.api+json'})
