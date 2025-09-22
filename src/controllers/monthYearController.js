const monthYearService = require("../services/monthYearService");

//controller to get months
const allMonths = async (req, res) => {
  try {
    const months = await monthYearService.getMonths();
    res.status(200).json({
      success: true,
      message: "Months fetched successfully",
      months,
    });
  } catch (err) {
    console.error("Error fetching months:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//controller to get years
const fetchYears = async (req, res) => {
  try {
    const years = await monthYearService.getYears();
    res.status(200).json({
      success: true,
      message: "Years fetched successfully",
      years,
    });
  } catch (err) {
    console.error("Error fetching years:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  allMonths,
  fetchYears,
};