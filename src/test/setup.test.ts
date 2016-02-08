import {ApiServer} from './utils/apiserver';
import {MongoDB} from './utils/mongodb';

before((done) => {
  MongoDB.start().then(() => {
    ApiServer.start().then(done).catch(done);
  }).catch(done);
});

after((done) => {
  ApiServer.stop();
  MongoDB.stop().then(done);
});