import { Document, Types } from "mongoose";

export interface UserHobby extends Document {
  user: Types.ObjectId;
  hobby: Types.ObjectId;
  notes?: string;
  performedAt: Date;
  rating?: number; // ✅ NEW FIELD
  createdAt: Date;
}
