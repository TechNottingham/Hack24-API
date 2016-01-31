var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.User = new Schema({
    name: { type: String, required: true },
    slackUsername: { type: String, unique : true, required : false, dropDups: true  },
    modified: { type: Date, default: Date.now }
});

exports.Team = new Schema({
    name: { type: String, unique : true, required : true, dropDups: true },
    motto: { type: String, required: false },
    modified: { type: Date, default: Date.now },
    members : [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

