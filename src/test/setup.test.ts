import {ApiServer} from './utils/apiserver';
import {MongoDB} from './utils/mongodb';

before(async (done) => {
  try {
    await MongoDB.ensureRunning();
    await ApiServer.start();
    done();
  } catch (err) {
    done(err);
  }
});

after((done) => {
  ApiServer.stop();
  done();
});