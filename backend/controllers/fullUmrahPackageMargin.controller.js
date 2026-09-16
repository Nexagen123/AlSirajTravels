import FullUmrahPackageMargin from "../models/FullUmrahPackageMargin.js";

/* ===========================
   GET Full Umrah Package Margin
   Returns the current margin for Full Umrah Package packages.
   Public endpoint (no auth) so frontend can fetch it without login.
=========================== */
export const getFullUmrahPackageMargin = async (req, res) => {
  try {
    const record = await FullUmrahPackageMargin.findOne({ type: "umrah" });

    res.status(200).json({
      success: true,
      data: {
        marginAmount: record?.marginAmount ?? 0,
      },
    });
  } catch (error) {
    console.error("Get FullUmrahPackageMargin Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ===========================
   SET / UPDATE Full Umrah Package Margin (Admin only)
   Upserts the single "umrah" margin record.
=========================== */
export const setFullUmrahPackageMargin = async (req, res) => {
  try {
    const marginAmount = Number(req.body.marginAmount);

    if (isNaN(marginAmount) || marginAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "marginAmount must be a non-negative number",
      });
    }

    const record = await FullUmrahPackageMargin.findOneAndUpdate(
      { type: "umrah" },
      {
        marginAmount,
        updatedBy: req.user?._id ?? null,
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Full Umrah Package margin updated successfully",
      data: {
        marginAmount: record.marginAmount,
      },
    });
  } catch (error) {
    console.error("Set FullUmrahPackageMargin Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
