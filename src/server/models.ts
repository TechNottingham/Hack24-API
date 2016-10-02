import {Schema, model, Document} from 'mongoose';

export interface User {
  userid: string;
  name: string;
  modified: Date;
}

export interface UserModel extends User, Document { }

export const UserSchema = new Schema({
  userid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  modified: { type: Date, default: Date.now },
});
export const UserModel = model<UserModel>('User', UserSchema);

export interface Team {
  teamid: string;
  name: string;
  motto: string;
  members: UserModel[];
  entries: HackModel[];
}

export interface TeamModel extends Team, Document { }

export const TeamSchema = new Schema({
  teamid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  motto: { type: String, required: false },
  modified: { type: Date, default: Date.now },
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  entries : [{ type: Schema.Types.ObjectId, ref: 'Hack' }],
});
export const TeamModel = model<TeamModel>('Team', TeamSchema);

export interface Hack {
  hackid: string;
  name: string;
  challenges: ChallengeModel[];
}

export interface HackModel extends Hack, Document { }

export const HackSchema = new Schema({
  hackid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  modified: { type: Date, default: Date.now },
  challenges : [{ type: Schema.Types.ObjectId, ref: 'Challenge' }],
});
export const HackModel = model<HackModel>('Hack', HackSchema);

export interface Challenge {
  challengeid: string;
  name: string;
}

export interface ChallengeModel extends Challenge, Document { }

export const ChallengeSchema = new Schema({
  challengeid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  modified: { type: Date, default: Date.now },
});
export const ChallengeModel = model<ChallengeModel>('Challenge', ChallengeSchema);

export interface Attendee {
  attendeeid: string;
}

export interface AttendeeModel extends Attendee, Document { }

export const AttendeeSchema = new Schema({
  attendeeid: { type: String, unique: true, required: true },
});
export const AttendeeModel = model<AttendeeModel>('Attendee', AttendeeSchema);

export enum MongoDBErrors {
  E11000_DUPLICATE_KEY = 11000
}
