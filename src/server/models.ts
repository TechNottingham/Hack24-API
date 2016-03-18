"use strict";

import {Schema, model, Document, Model} from 'mongoose';

export interface IUser {
  userid: string;
  name: string;
  modified: Date;
}

export interface IUserModel extends IUser, Document { }

export const UserSchema = new Schema({
  userid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  modified: { type: Date, default: Date.now },
});
export const UserModel = model<IUserModel>('User', UserSchema);



export interface ITeam {
  teamid: string;
  name: string;
  motto: string;
  members: IUserModel[];
  entries: IHackModel[];
}

export interface ITeamModel extends ITeam, Document { }

export const TeamSchema = new Schema({
  teamid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  motto: { type: String, required: false },
  modified: { type: Date, default: Date.now },
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  entries : [{ type: Schema.Types.ObjectId, ref: 'Hack' }]
});
export const TeamModel = model<ITeamModel>('Team', TeamSchema);



export interface IHack {
  hackid: string;
  name: string;
  challenges: IChallengeModel[];
}

export interface IHackModel extends IHack, Document { }

export const HackSchema = new Schema({
  hackid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  modified: { type: Date, default: Date.now },
  challenges : [{ type: Schema.Types.ObjectId, ref: 'Challenge' }]
});
export const HackModel = model<IHackModel>('Hack', HackSchema);



export interface IChallenge {
  challengeid: string;
  name: string;
}

export interface IChallengeModel extends IChallenge, Document { }

export const ChallengeSchema = new Schema({
  challengeid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  modified: { type: Date, default: Date.now }
});
export const ChallengeModel = model<IChallengeModel>('Challenge', ChallengeSchema);



export interface IAttendee {
  attendeeid: string;
}

export interface IAttendeeModel extends IAttendee, Document { }

export const AttendeeSchema = new Schema({
  attendeeid: { type: String, unique: true, required: true },
});
export const AttendeeModel = model<IAttendeeModel>('Attendee', AttendeeSchema);



export enum MongoDBErrors {
  E11000_DUPLICATE_KEY = 11000
}
