import 'promisify-supertest';
import {ApiServer} from './utils/apiserver';
import {MongoDB} from './utils/mongodb';

before(async () => {
  await MongoDB.ensureRunning();
  await ApiServer.start();
});

after(() => {
  ApiServer.stop();
});
