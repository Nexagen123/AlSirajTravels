import FzPakistanUmrahMargin from "../models/FzPakistanUmrahMargin.js";

/* ===========================
   GET Flying Zone Pakistan Umrah Margin
   Returns the current margin for FZ Pakistan umrah packages.
   Public endpoint (no auth) so frontend can fetch it without login.
=========================== */
export const getFzPakistanUmrahMargin = async (req, res) => {
  try {
    const record = await FzPakistanUmrahMargin.findOne({ type: "umrah" });

    res.status(200).json({
      success: true,
      data: {
        marginAmount: record?.marginAmount ?? 0,
      },
    });
  } catch (error) {
    console.error("Get FzPakistanUmrahMargin Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================
   SET / UPDATE Flying Zone Pakistan Umrah Margin (Admin only)
   Upserts the single "umrah" margin record.
=========================== */
export const setFzPakistanUmrahMargin = async (req, res) => {
  try {
    const marginAmount = Number(req.body.marginAmount);

    if (isNaN(marginAmount) || marginAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "marginAmount must be a non-negative number",
      });
    }

    const record = await FzPakistanUmrahMargin.findOneAndUpdate(
      { type: "umrah" },
      {
        marginAmount,
        updatedBy: req.user?._id ?? null,
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Flying Zone Pakistan margin updated successfully",
      data: {
        marginAmount: record.marginAmount,
      },
    });
  } catch (error) {
    console.error("Set FzPakistanUmrahMargin Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
