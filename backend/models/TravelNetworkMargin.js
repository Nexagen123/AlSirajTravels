import mongoose from "mongoose";

/**
 * Stores the global margin applied to all Travel Network umrah packages.
 * Only one record of type "umrah" will exist (upserted).
 */

const travelNetworkMarginSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["umrah"],
      default: "umrah",
      required: true,
      unique: true,
    },
    // Fixed PKR amount added on top of every room type price
    marginAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Register",
    },
  },
  { timestamps: true },
);

export default mongoose.model("TravelNetworkMargin", travelNetworkMarginSchema);
