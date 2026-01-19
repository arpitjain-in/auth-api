const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const PORT = process.env.PORT || 3000;

// MySQL database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "railway",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Get salt for username (prevents rainbow table attacks)
app.post("/api/get-salt", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username required",
      });
    }

    const connection = await pool.getConnection();
    try {
      // Check if user exists
      const [rows] = await connection.query(
        "SELECT salt FROM users WHERE username = ?",
        [username],
      );

      if (rows.length === 0) {
        // User doesn't exist yet, generate a new salt
        const salt = crypto
          .createHash("sha256")
          .update(username + "server-pepper-secret")
          .digest("hex")
          .substring(0, 16);

        return res.json({
          success: true,
          salt,
          isNewUser: true,
        });
      }

      // User exists, return their salt
      res.json({
        success: true,
        salt: rows[0].salt,
        isNewUser: false,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Get salt error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, clientHash } = req.body;

    if (!username || !clientHash) {
      return res.status(400).json({
        success: false,
        message: "Username and password hash are required",
      });
    }

    const connection = await pool.getConnection();
    try {
      // Check if user exists
      const [existingUsers] = await connection.query(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        [username, email],
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Username or email already exists",
        });
      }

      // Generate salt for the new user
      const salt = crypto
        .createHash("sha256")
        .update(username + "server-pepper-secret")
        .digest("hex")
        .substring(0, 16);

      // Insert user into database
      const [result] = await connection.query(
        "INSERT INTO users (username, 'abc@xyz.com', passwordHash, salt, is_active) VALUES (?, ?, ?, ?, TRUE)",
        [username, email || null, clientHash, salt],
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: result.insertId,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, clientHash, nonce } = req.body;

    if (!username || !clientHash || !nonce) {
      return res.status(400).json({
        success: false,
        message: "Invalid login request",
      });
    }

    const connection = await pool.getConnection();
    try {
      // Find user in database
      const [users] = await connection.query(
        "SELECT id, username, passwordHash FROM users WHERE username = ?",
        [username],
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const user = users[0];

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

      // Update last_login timestamp
      await connection.query(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        [user.id],
      );

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
    } finally {
      connection.release();
    }
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
