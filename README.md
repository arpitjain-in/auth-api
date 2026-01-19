# Auth API - Salt-Based Authentication

A production-ready Node.js authentication API with bcrypt-based password hashing. Designed for easy deployment on Railway.

## 🔐 Security Features

- **Salt-Based Password Hashing**: bcrypt with automatic salt generation
- **Secure Password Storage**: One-way hashing with salt
- **JWT Token Auth**: Stateless authentication with 24h expiry
- **Rate Limiting**: Prevents brute force attacks (10 req/15min)
- **Security Headers**: Helmet.js integration
- **HTTPS Ready**: Deployment-ready for Railway
- **Input Validation**: Username, email, and password validation

## 📋 Prerequisites

- Node.js 14+ and npm
- Git (for deployment)
- Railway.app account (for hosting)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Locally

```bash
npm start
```

Server runs on `http://localhost:3000`

### 3. Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/logout` | Logout (requires token) |

### User

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/profile` | Get user profile (requires token) |

### System

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check |

**Full API documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🔄 Authentication Flow

```
1. Frontend → Register
   POST /api/auth/register { username, email, password }
   
2. Server → Hash with bcrypt (includes salt)
   Generates salt, hashes password, stores user
   
3. Frontend → Receive User ID
   Returns userId, user registered
   
4. Frontend → Login
   POST /api/auth/login { username, password }
   
5. Server → Verify with bcrypt
   Extracts salt from stored hash, compares password
   
6. Frontend → Receive Token
   Returns JWT token for authenticated requests
   
7. Frontend → Use Token
   Authorization: Bearer <token>
```

## 💻 Frontend Implementation

### JavaScript Example

```javascript
// Register
const registerRes = await fetch('https://api.example.com/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    username: 'john', 
    email: 'john@example.com',
    password: 'securepassword123'
  })
});

const { userId } = await registerRes.json();
console.log('Registered:', userId);

// Login
const loginRes = await fetch('https://api.example.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    username: 'john', 
    password: 'securepassword123'
  })
});

const { token } = await loginRes.json();
localStorage.setItem('authToken', token);

// Use token
const profileRes = await fetch('https://api.example.com/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**More examples**: See [CLIENT_EXAMPLE.md](./CLIENT_EXAMPLE.md)

## 🚢 Deploy to Railway

### Option 1: Using GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Railway**
   - Go to [railway.app/dashboard](https://railway.app/dashboard)
   - New Project → Deploy from GitHub
   - Select this repository

3. **Set Environment Variables**
   - `JWT_SECRET`: Strong random key (use: `openssl rand -base64 32`)
   - `NODE_ENV`: `production`

### Option 2: Using Railway CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

**Detailed guide**: See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

## 🔧 Configuration

### Environment Variables

```bash
PORT=3000                                    # Server port (Railway assigns this)
JWT_SECRET=your-super-secret-key            # CHANGE THIS in production!
NODE_ENV=production                          # Set to 'production' on Railway
```

### Generate Strong JWT_SECRET

```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Linux command
head -c 32 /dev/urandom | base64
```

## 📁 Project Structure

```
auth-api/
├── nodejs-login-api.js          # Main server file
├── package.json                 # Dependencies
├── API_DOCUMENTATION.md         # Full API docs
├── CLIENT_EXAMPLE.md            # Frontend implementation examples
├── RAILWAY_DEPLOYMENT.md        # Railway deployment guide
├── README.md                    # This file
└── .env.example                 # Environment variables template
```

## 📦 Dependencies

```json
{
  "express": "^4.18.2",           // Web framework
  "bcryptjs": "^2.4.3",           // Password hashing
  "jsonwebtoken": "^9.0.0",       // JWT token creation
  "helmet": "^7.0.0",             // Security headers
  "express-rate-limit": "^7.0.0"  // Rate limiting
}
```

## 🧪 Testing

### Register New User

```bash
# 1. Get challenge
curl -X POST http://localhost:3000/api/auth/register/challenge \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com"}'

# Response:
# {
#   "success": true,
#   "challenge": "abc123def456...",
#   "algorithm": "SHA-256"
# }

# 2. Hash password (locally) and register
# clientHash = SHA256('testpass123' + 'abc123def456...')

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "clientHash":"<computed hash>"
  }'
```

### Login

```bash
# 1. Get login challenge
curl -X POST http://localhost:3000/api/auth/login/challenge \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser"}'

# 2. Hash and login (compute clientHash locally)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username":"testuser",
    "clientHash":"<computed hash>"
  }'

# Response:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": "...", "username": "testuser", "email": "test@example.com" }
# }
```

### Get Profile (With Token)

```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer <your-token-here>"
```

## 🔒 Security Best Practices

✅ **Implemented:**
- Passwords never sent in plain text
- Challenge-response prevents replay attacks
- Two-layer hashing (SHA256 + bcrypt)
- Rate limiting on auth endpoints
- JWT for stateless authentication
- Helmet.js security headers
- Input validation

⚠️ **For Production:**
- ✅ Use HTTPS (Railway provides automatically)
- ✅ Set strong `JWT_SECRET`
- ⚠️ Migrate to real database (PostgreSQL/MongoDB)
- ⚠️ Use Redis for challenge storage
- ⚠️ Add CORS for your frontend domain
- ⚠️ Implement token refresh mechanism
- ⚠️ Add email verification for registration
- ⚠️ Implement 2FA for extra security
- ⚠️ Monitor failed login attempts

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md#production-recommendations) for production setup.

## 📖 Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete endpoint reference
- **[CLIENT_EXAMPLE.md](./CLIENT_EXAMPLE.md)** - Frontend implementation examples
- **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** - Deployment guide

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Try different port
PORT=3001 npm start
```

### Module not found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Challenge expired error
- Challenges expire after 5 minutes
- Request a new challenge and retry

### Invalid credentials error
- Verify username is correct
- Ensure password hashing matches (SHA256)
- Check challenge is being used correctly

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

- 📚 Check documentation in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- 🚀 Deployment help in [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- 💻 Frontend help in [CLIENT_EXAMPLE.md](./CLIENT_EXAMPLE.md)

## 🌟 Key Features

- ✅ **Zero Plain-Text Passwords** - Challenge-response authentication
- ✅ **Production Ready** - Error handling, rate limiting, security headers
- ✅ **Easy Deployment** - One-click Railway deployment
- ✅ **Well Documented** - Comprehensive guides and examples
- ✅ **Scalable** - Architecture ready for database and cache layer
- ✅ **Secure** - Multiple layers of hashing and security practices

---

**Made for Railway deployment. Deploy with confidence. 🚀**
