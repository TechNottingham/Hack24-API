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
  members: IUserModel[];
}

export interface ITeamModel extends ITeam, Document { }

export const TeamSchema = new Schema({
  teamid: { type: String, unique: true, required: true },
  name: { type: String, unique : true, required : true },
  motto: { type: String, required: false },
  modified: { type: Date, default: Date.now },
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }]
});
export const TeamModel = model<ITeamModel>('Team', TeamSchema);

export interface IModels {
  User: Model<IUserModel>;
  Team: Model<ITeamModel>;
}