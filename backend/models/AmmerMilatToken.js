import mongoose from "mongoose";

const AmmerMilatTokenSchema = new mongoose.Schema(
  {
    token: { type: String, default: null },
    expiry: { type: Date, default: null },
  },
  { timestamps: true },
);

const AmmerMilatToken = mongoose.model("AmmerMilatToken", AmmerMilatTokenSchema);

export default AmmerMilatToken;
