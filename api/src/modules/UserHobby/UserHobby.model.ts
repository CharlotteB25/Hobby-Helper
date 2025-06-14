import mongoose from "mongoose";
import { UserHobby } from "./UserHobby.types";

const userHobbySchema = new mongoose.Schema<UserHobby>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hobby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hobby",
      required: true,
    },
    notes: { type: String },
    performedAt: { type: Date, required: true },
    rating: { type: Number, min: 1, max: 5 }, // ✅ NEW FIELD
  },
  {
    timestamps: true,
  }
);

const UserHobbyModel = mongoose.model<UserHobby>("UserHobby", userHobbySchema);
export default UserHobbyModel;
