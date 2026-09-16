import TravelNetworkMargin from "../models/TravelNetworkMargin.js";

/* ===========================
   GET Travel Network Margin
   Returns the current margin for travel network umrah packages.
   Public endpoint (no auth) so frontend can fetch it without login.
=========================== */
export const getTravelNetworkMargin = async (req, res) => {
  try {
    const record = await TravelNetworkMargin.findOne({ type: "umrah" });

    res.status(200).json({
      success: true,
      data: {
        marginAmount: record?.marginAmount ?? 0,
      },
    });
  } catch (error) {
    console.error("Get TravelNetworkMargin Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================
   SET / UPDATE Travel Network Margin (Admin only)
   Upserts the single "umrah" margin record.
=========================== */
export const setTravelNetworkMargin = async (req, res) => {
  try {
    const marginAmount = Number(req.body.marginAmount);

    if (isNaN(marginAmount) || marginAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "marginAmount must be a non-negative number",
      });
    }

    const record = await TravelNetworkMargin.findOneAndUpdate(
      { type: "umrah" },
      {
        marginAmount,
        updatedBy: req.user?._id ?? null,
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Travel Network margin updated successfully",
      data: {
        marginAmount: record.marginAmount,
      },
    });
  } catch (error) {
    console.error("Set TravelNetworkMargin Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
