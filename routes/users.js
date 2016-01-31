var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.get = function(req, res) {
  if (req.query.slackUsername){
      return req.models.User.findOne({ 'slackUsername': req.query.slackUsername })
      .exec(function (err, team) {
        if (!err) {
          return res.send(team);
        } else {
           console.log(err);
           return res.status(404).send('Not found');
        }
    });
  }
  else if (req.query.name){
      return req.models.User.findOne({ 'name': req.query.name })
      .exec(function (err, team) {
        if (!err) {
          return res.send(team);
        } else {
           console.log(err);
           return res.status(404).send('Not found');
        }
    });
  }
  else{
    return req.models.User.find(function (err, users) {
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
exports.getById = function(req, res) {
    return req.models.User.findById(req.params.id, function (err, user) {
    if (!err) {
      return res.send(user);
    } else {
       console.log(err);
       return res.status(404).send('Not found');
    }
  });
};

exports.getByName = function(req, res) {

};

exports.create = function(req, res) {
  var user;
  console.log("POST: ");
  console.log(req.body);
  user = new req.models.User({
    name: req.body.name,
    slackUsername: req.body.slackUsername
  });
  user.save(function (err) {
    if (!err) {
      return console.log("created");
      return res.send(user);
    } else {
      return console.log(err);
      return res.status(400).send('Create failed');
    }
  });

};


exports.update =  function (req, res){
  return req.models.User.findById(req.params.id, function (err, user) {
    user.name= req.body.name;
    user.slackUsername= req.body.slackUsername;
    user.modified = Date.now;
    return user.save(function (err) {
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

  exports.delete =  function (req, res){
    return req.models.User.findById(req.params.id, function (err, user) {
        if (err)
        {
            return res.status(404).send('Not found');
        }
        return user.remove(function (err) {
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
