import {Schema, model} from 'mongoose';

export const UserSchema = new Schema({
    id: { type: String, unique : true, required: true },
    name: { type: String, required : true  },
    modified: { type: Date, default: Date.now }
});
export const UserModel = model('User', UserSchema);

export const TeamSchema = new Schema({
    name: { type: String, unique : true, required : true },
    motto: { type: String, required: false },
    modified: { type: Date, default: Date.now },
    members : [{ type: Schema.Types.ObjectId, ref: 'User' }]
});
export const TeamModel = model('Team', TeamSchema);