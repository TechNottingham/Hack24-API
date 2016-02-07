import * as assert from 'assert';
import {MongoDB, IUser} from './utils/mongodb';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest'

describe('Users resource', () => {
  
  let api: request.SuperTest;
  
  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });
  
  describe('POST user', () => {
    
    let user: IUser;
    let createdUser: IUser;
    
    before((done) => {
      user = {
        id: 'U12345',
        name: 'Nigel',
        modified: new Date
      };
      
      api.post('/users')
         .send({ id: user.id, name: user.name })
         .set('Accept', 'application/json')
         .end((err, res) => {
           if (err) return done(err);
           
           MongoDB.Users.findbyId(user.id).then((user) => {
             createdUser = user;
             done();
           }).catch(done);
         });
    });
    
    it('should create the user with the expected ID and name', () => {
      assert.ok(createdUser, 'User not found');
      assert.strictEqual(createdUser.id, user.id);
      assert.strictEqual(createdUser.name, user.name);
    });
    
    after((done) => {
      MongoDB.Users.removeById(user.id).then(done).catch(done);
    });
    
  });
  
});