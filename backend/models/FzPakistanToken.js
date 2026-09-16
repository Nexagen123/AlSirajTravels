import mongoose from "mongoose";

const FzPakistanTokenSchema = new mongoose.Schema(
    {
        token: { type: String, default: null },
        expiry: { type: Date, default: null },
    },
    { timestamps: true },
);

const FzPakistanToken = mongoose.model("FzPakistanToken", FzPakistanTokenSchema);

export default FzPakistanToken;
