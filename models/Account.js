import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['BANK', 'WALLET', 'CASH', 'CREDIT_CARD', 'INVESTMENT'],
      default: 'BANK',
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Account', accountSchema);
