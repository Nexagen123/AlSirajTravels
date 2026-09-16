import mongoose from "mongoose";

const fzPakistanGroupOverrideSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    individualMargin: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model(
  "FzPakistanGroupOverride",
  fzPakistanGroupOverrideSchema,
);