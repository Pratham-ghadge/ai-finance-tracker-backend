import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    type: {
      type: String,
      enum: ['INCOME', 'EXPENSE'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['MANUAL', 'CSV', 'SMS'],
      default: 'MANUAL',
    },
    smsRaw: {
      type: String,
      default: '',
    },
    importBatchId: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
