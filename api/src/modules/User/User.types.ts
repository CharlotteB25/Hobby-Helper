import { Document, Types } from "mongoose";

export interface IUserHobby {
  hobby: Types.ObjectId;
  performedAt: Date;
  notes?: string;
}

export interface IUserPreferences {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  favouriteTags: string[];
  hobbies: IUserHobby[];
  preferences: IUserPreferences;

  comparePassword: (password: string) => Promise<boolean>;
  generateToken: () => string;
}
