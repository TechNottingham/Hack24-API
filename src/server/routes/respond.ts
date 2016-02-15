import {Response} from 'express'

export function Send400(res: Response) {
  res.status(400).contentType('text/plain').send('Bad Request');
}

export function Send404(res: Response) {
  res.status(404).contentType('text/plain').send('Not Found');
}

export function Send409(res: Response) {
  res.status(409).contentType('text/plain').send('Conflict');
}

export function Send500(res: Response, err?: Error) {
  console.error('Sending 500 response', err);
  res.status(500).send('Internal Server Error');
}