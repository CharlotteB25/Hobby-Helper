import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser, IUserHobby } from "./User.types";

const userHobbySchema = new Schema<IUserHobby>({
  hobby: { type: Schema.Types.ObjectId, ref: "Hobby", required: true },
  performedAt: { type: Date, required: true },
  notes: { type: String },
});

const preferencesSchema = new Schema({
  wheelchairAccessible: { type: Boolean, default: false },
  ecoFriendly: { type: Boolean, default: false },
  trialAvailable: { type: Boolean, default: false },
});

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    favouriteTags: { type: [String], default: [] },
    hobbies: { type: [userHobbySchema], default: [] },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// Pre-save hook
userSchema.pre("save", async function (next) {
  const user = this as IUser;
  if (!user.isModified("password")) return next();
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  next();
});

// Instance methods
userSchema.methods.comparePassword = function (password: string) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function () {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET || "", {
    expiresIn: "2h",
  });
};

// Hide password
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
