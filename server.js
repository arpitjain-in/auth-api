const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const PORT = process.env.PORT || 3000;

// Mock user database
// In production, store these in a real database
const users = [
  {
    id: 1,
    username: "testuser",
    // This is SHA-256 hash of 'password123', then hashed again server-side
    passwordHash:
      "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
  },
];

// Get salt for username (prevents rainbow table attacks)
app.post("/api/get-salt", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username required",
    });
  }

  // Generate a unique salt for this username
  // In production, store this salt with the user in the database
  const salt = crypto
    .createHash("sha256")
    .update(username + "server-pepper-secret")
    .digest("hex")
    .substring(0, 16);

  res.json({
    success: true,
    salt,
  });
});

// Register endpoint
app.post("/api/register", (req, res) => {
  try {
    const { username, clientHash } = req.body;

    if (!username || !clientHash) {
      return res.status(400).json({
        success: false,
        message: "Username and password hash are required",
      });
    }

    // Check if user exists
    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Store the clientHash directly
    // clientHash = SHA-256(password + salt)
    const newUser = {
      id: users.length + 1,
      username,
      passwordHash: clientHash, // Store client's hash
    };
    users.push(newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: newUser.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Login endpoint
app.post("/api/login", (req, res) => {
  try {
    const { username, clientHash, nonce } = req.body;

    if (!username || !clientHash || !nonce) {
      return res.status(400).json({
        success: false,
        message: "Invalid login request",
      });
    }

    // Find user
    const user = users.find((u) => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify the client hash with nonce
    // Client sends: SHA-256(SHA-256(password + salt) + nonce)
    // We have stored: SHA-256(password + salt)
    // So we compute: SHA-256(stored_hash + nonce) and compare

    const expectedHash = crypto
      .createHash("sha256")
      .update(user.passwordHash + nonce)
      .digest("hex");

    // Compare what client sent vs what we expect
    if (clientHash !== expectedHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Protected route
app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid token",
      });
    }
    req.user = user;
    next();
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Example usage:
// const result = await register('john', 'mypassword123');
// const loginResult = await login('john', 'mypassword123');
