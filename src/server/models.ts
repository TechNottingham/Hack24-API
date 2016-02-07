import {Schema} from 'mongoose';

export var UserModel = new Schema({
    id: { type: String, unique : true, required: true },
    name: { type: String, required : true  },
    modified: { type: Date, default: Date.now }
});

export var TeamModel = new Schema({
    name: { type: String, unique : true, required : true, dropDups: true },
    motto: { type: String, required: false },
    modified: { type: Date, default: Date.now },
    members : [{ type: Schema.Types.ObjectId, ref: 'User' }]
});