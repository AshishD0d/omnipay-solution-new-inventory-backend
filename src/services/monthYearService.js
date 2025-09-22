
// Service to provide month names
const getMonths = () => {
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
};

// Service to provide years from 2021 to 2040
const getYears = () => {
  const years = [];
  for (let year = 2021; year <= 2040; year++) {
    years.push(year);
  }
  return years;
};

module.exports = { getMonths, getYears };
