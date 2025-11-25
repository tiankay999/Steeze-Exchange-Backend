const express = require('express');
const app = express();
const { sequelize } = require('./config/database');
const User = require('./models/users');
const Transaction = require('./models/transactions');
const Wallet = require('./models/wallet');
const axios = require('axios');
const jsonwebtoken = require('jsonwebtoken');
const dotenv = require('dotenv');
const authMiddleware = require('./middleware/authMiddleware');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// ==========================================
// 1. MIDDLEWARE (MUST BE AT THE TOP)
// ==========================================

// ✅ CORS MUST be defined BEFORE your routes
const corsOptions = {
  origin: "http://localhost:3000", // Your Next.js frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Apply CORS globally
app.use(cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ==========================================
// 2. ROUTES
// ==========================================

// Mount external routes
const router = require('./routes/route');
app.use(router); 
// Note: If your frontend calls '/api/payment/initialize', 
// ensure your 'router' file handles that path.

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ message: 'OK' });
});

// Register
app.post('/register', async (req, res) => {
    const { name, username, email, password } = req.body;
    try {
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required!' });
        }
        const signup = await User.create({ name, username, email, password });
        const WalletCreate = await Wallet.create({ uid: signup.id, balance: 0, currency: 'USD' });
        
        if (signup && WalletCreate) {
            res.status(201).json({ message: 'User Account Created successfully!', signup, WalletCreate });
        } else {
            res.status(400).json({ message: 'User Account Creation Failed!' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'All fields are required!' });
        }
        const login = await User.findOne({ where: { username } });
        
        if (!login) {
            return res.status(400).json({ message: 'User Not Found!' });
        }
        if (login.password !== password) {
            return res.status(400).json({ message: 'Incorrect Password!' });
        }

        const token = jsonwebtoken.sign(
            { username: login.username, id: login.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).json({ message: 'User Logged In successfully!', token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
});

// Deposit
app.post('/deposit', authMiddleware, async (req, res) => {
    const uid = req.user.id;
    const amount = Number(req.body.amount);
    try {
        if (!amount) {
            return res.status(400).json({ message: 'Amount fields are required!' });
        }
        const wallet = await Wallet.findOne({ where: { uid } });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet Not Found!' });
        }
        if (wallet) {
            const balance = parseFloat(wallet.balance) + parseFloat(amount);
            // wallet.balance = balance; // Not strictly needed if we run update below
            const total = balance; // Adjusted logic slightly for clarity

            const update = await Wallet.update({ balance: total }, { where: { uid } });
            if (update) {
                const Trans = await Transaction.create({ uid, type: 'deposit', amount, status: "Deposit Successful" });

                if (Trans) {
                    res.status(200).json({ message: `You have successfully Deposited ${amount} to your wallet!` });
                }
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
});

// Binance API
const COINS = [
    { symbol: "BTC", pair: "BTCUSDT" },
    { symbol: "ETH", pair: "ETHUSDT" },
    { symbol: "BNB", pair: "BNBUSDT" },
    { symbol: "SOL", pair: "SOLUSDT" },
    { symbol: "ADA", pair: "ADAUSDT" },
    { symbol: "XRP", pair: "XRPUSDT" },
];

app.get("/market-prices", async (req, res) => {
    try {
        const requests = COINS.map((coin) =>
            axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${coin.pair}`)
        );

        const responses = await Promise.all(requests);

        const coins = responses.map((response, index) => {
            const binanceData = response.data;
            const coinInfo = COINS[index];
            return {
                symbol: coinInfo.symbol,
                pair: binanceData.symbol,
                price: Number(binanceData.price)
            };
        });

        res.json({ coins });
    } catch (error) {
        console.error("Error fetching market prices:", error.message);
        res.status(500).json({
            message: "Could not fetch market prices. Please try again later.",
        });
    }
});

app.get("/users", async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

// User Profile
app.get("/user", authMiddleware, async (req, res) => {
    const userID = req.user.id;
    try {
        // FindOne is better here if you only expect one user
        const user = await User.findOne({ where: { id: userID } });
        if (!user) {
            return res.status(404).json({ message: "User Not Found!" });
        } else {
            res.status(200).json([user]); // Returning array to match your previous findAll behavior
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

// Check Balance
app.get("/check-balance", authMiddleware, async (req, res) => {
    const id = req.user.id;
    try {
        if (!id) {
            return res.status(400).json({ message: "Cannot find user!" });
        }
        const user = await Wallet.findOne({ where: { uid: id } });
        if (user) {
            return res.status(200).json({ balance: user.balance, currency: user.currency });
        } else {
            return res.status(404).json({ message: "Account Not Found!" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

// ==========================================
// 3. UPLOAD HANDLING
// ==========================================

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Only images (jpeg, jpg, png, gif) are allowed!'));
    }
}).single('profileImage');

app.post('/profile-upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file selected!' });
        }

        const filePath = `/uploads/${req.file.filename}`;
        res.status(200).json({
            message: 'File uploaded successfully',
            filePath: filePath,
            fileName: req.file.filename
        });
    });
});

// ==========================================
// 4. SERVER START & 404 HANDLER
// ==========================================

// ✅ THE FIX: Safe Catch-All route for Express 5
// This replaces app.use('*') which causes the "Missing parameter name" crash.
app.all('*splat', (req, res) => {
    res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    sequelize.sync()
        .then(() => {
            console.log('Database & tables created!');
        })
        .catch(err => console.log("DB Sync Error:", err));
});