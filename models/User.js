import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    familyDetails: {
      membersCount: { type: Number, default: 1 },
      hasChildren: { type: Boolean, default: false },
      childrenCount: { type: Number, default: 0 },
      educationBudget: { type: Number, default: 0 },
      savingsTarget: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
