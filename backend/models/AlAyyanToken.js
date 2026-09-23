import mongoose from "mongoose";

const AlAyyanTokenSchema = new mongoose.Schema(
  {
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiry: { type: Date, default: null },
    credentialHash: { type: String, default: null },
  },
  { timestamps: true },
);

const AlAyyanToken = mongoose.model("AlAyyanToken", AlAyyanTokenSchema);

export default AlAyyanToken;
