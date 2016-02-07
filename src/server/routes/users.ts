import {Request, Response} from 'express'
import {IUserModel, ITeamModel, IModels} from '../models'
import {Model, Document} from 'mongoose';

declare interface RequestWithModels extends Request {
  models: IModels
}

interface IUserResponse {
  userid: string;
  name: string;
  team?: string;
}

function send500(res: Response, err?: Error) {
  console.error('Sending 500 response', err);
  res.status(500).send('Internal Server Error');
}

export var Get = function(req, res) {
  if (req.query.slackUsername) {
    return req.models.User.findOne({ 'slackUsername': req.query.slackUsername })
      .exec(function(err, team) {
        if (!err) {
          return res.send(team);
        } else {
          console.log(err);
          return res.status(404).send('Not found');
        }
      });
  }
  else if (req.query.name) {
    return req.models.User.findOne({ 'name': req.query.name })
      .exec(function(err, team) {
        if (!err) {
          return res.send(team);
        } else {
          console.log(err);
          return res.status(404).send('Not found');
        }
      });
  }
  else {
    return req.models.User.find(function(err, users) {
      if (!err) {
        return res.send(users);
      } else {
        return console.log(err);
      }
    });
  }
};

/*Category.find().populate('posts').exec(function(err, categories) {
  // handle err
  async.forEach(categories, function(category, done) {
    Post.find().where('categories').in([category.id]).exec(function(err, posts) {
      category.posts = posts;
      done(err);
    });
  }, function(err) {
    // ... you have categories with posts
  });
});
*/
export var GetByUserId = function(req: RequestWithModels, res: Response) {
  return req.models.User.findOne({ userid: req.params.userid }, 'userid name' , (err, user) => {
    if (err) return send500(res, err);
    if (!user) return res.status(404).send('User not found');
    
    req.models.Team.findOne({ members: { $in: [user._id] }}, 'name', (err, team) => {
      if (err) return send500(res, err);
      
      let userResponse: IUserResponse = {
        userid: user.userid,
        name: user.name
      };
      if (team) userResponse.team = team.name;
      
      res.status(200).send(userResponse);    
    })
  });
};

export var GetByName = function(req, res) {

};

export var Create = (req: RequestWithModels, res: Response) => {
  const user = new req.models.User({
    userid: req.body.userid,
    name: req.body.name
  });
  req.models.User.find({ userid: req.body.userid }, (err, users) => {
    if (err) return send500(res, err);
    if (users.length !== 0) return res.status(409).send('User already exists');
    
    user.save((err) => {
      if (err) return send500(res, err);
      
      let userResponse: IUserResponse = {
        userid: user.userid,
        name: user.name
      };
      
      res.status(201).send(userResponse);
    });
  });
};


export var Update = function(req, res) {
  return req.models.User.findById(req.params.id, function(err, user) {
    user.name = req.body.name;
    user.slackUsername = req.body.slackUsername;
    user.modified = Date.now;
    return user.save(function(err) {
      if (!err) {
        console.log("updated");
        return res.send(user);
      } else {
        console.log(err);
        return res.status(404).send('Not found');
      }

    });


  });
};

export var Delete = function(req, res) {
  return req.models.User.findById(req.params.id, function(err, user) {
    if (err) {
      return res.status(404).send('Not found');
    }
    return user.remove(function(err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
        return res.status(404).send('Not found');
      }
    });
  });
};
