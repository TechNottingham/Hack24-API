import {ApiServer} from './utils/apiserver';
import {MongoDB} from './utils/mongodb';

before(async (done) => {
  try {
    await MongoDB.start();
    await ApiServer.start();
    done();
  } catch (err) {
    done(err);
  }
});

after(async (done) => {
  ApiServer.stop();
  await MongoDB.stop();
  done();
});