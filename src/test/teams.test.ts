import * as assert from 'assert';
import {MongoDB} from './utils/mongodb';
import {ITeam} from './models/teams';
import {ApiServer} from './utils/apiserver';
import * as request from 'supertest';
import {Random} from './utils/random';

describe('Teams resource', () => {

  let api: request.SuperTest;

  before(() => {
    api = request('http://localhost:' + ApiServer.Port);
  });

  describe('POST new team', () => {

    let team: ITeam;
    let createdTeam: ITeam;
    let statusCode: number;
    let contentType: string;

    before((done) => {
      team = {
        name: 'Team_' + Random.str(5)
      };

      api.post('/teams')
        .send({ name: team.name })
        .set('Accept', 'application/json')
        .end((err, res) => {
          if (err) return done(err);

          statusCode = res.status;
          contentType = res.header['content-type'];

          MongoDB.Teams.findbyName(team.name).then((team) => {
            createdTeam = team;
            done();
          }).catch(done);
        });
    });

    it('should respond with status code 201 Created', () => {
      assert.strictEqual(statusCode, 201);
    });

    it('should return application/json content with charset utf-8', () => {
      assert.strictEqual(contentType, 'application/json; charset=utf-8');
    });

    it('should create the team with the expected name', () => {
      assert.ok(createdTeam, 'Team not found');
      assert.strictEqual(createdTeam.name, team.name);
    });

    after((done) => {
      MongoDB.Teams.removeByName(team.name).then(done).catch(done);
    });

  });

});