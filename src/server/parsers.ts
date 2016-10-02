import {json as parser} from 'body-parser';

export var JsonApiParser = parser({ type: 'application/vnd.api+json'});