import AlAyyanUmrahMargin from "../models/AlAyyanUmrahMargin.js";

/* ===========================
   GET Al Ayyan Umrah Margin
   Returns the current margin for Al Ayyan travel packages.
   Public endpoint (no auth) so frontend can fetch it without login.
=========================== */
export const getAlAyyanUmrahMargin = async (req, res) => {
  try {
    const record = await AlAyyanUmrahMargin.findOne({ type: "umrah" });

    res.status(200).json({
      success: true,
      data: {
        marginAmount: record?.marginAmount ?? 0,
      },
    });
  } catch (error) {
    console.error("Get AlAyyanUmrahMargin Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================
   SET / UPDATE Al Ayyan Umrah Margin (Admin only)
   Upserts the single "umrah" margin record.
=========================== */
export const setAlAyyanUmrahMargin = async (req, res) => {
  try {
    const marginAmount = Number(req.body.marginAmount);

    if (isNaN(marginAmount) || marginAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "marginAmount must be a non-negative number",
      });
    }

    const record = await AlAyyanUmrahMargin.findOneAndUpdate(
      { type: "umrah" },
      {
        marginAmount,
        updatedBy: req.user?._id ?? null,
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Al Ayyan margin updated successfully",
      data: {
        marginAmount: record.marginAmount,
      },
    });
  } catch (error) {
    console.error("Set AlAyyanUmrahMargin Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
