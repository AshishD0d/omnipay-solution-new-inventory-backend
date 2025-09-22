const authService = require("../services/authservice");

// login controller
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }
  try {
    const user = await authService.login(username, password);
    if (user) {
      const token = authService.generateToken(user);
      return res.status(200).json({success: true, message: "Login successful", user, token });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// get user profile controller
const getUserProfile = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const { UserRole, UserName, EmailID } = req.user;

    res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: {
        role: UserRole,
        name: UserName,
        email: EmailID,
        SupportEmail: "support@omnipay-solution.com",
        SupportPhone: "9089260004",
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};





module.exports = { login, getUserProfile };
