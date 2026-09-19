require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;

// Track active database type: 'atlas', 'local', or 'local-fallback'
let activeDbType = 'local-fallback';

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      type: isMongoConnected ? activeDbType : 'local-fallback (file-based)',
      info: isMongoConnected
        ? activeDbType === 'local'
          ? (process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/taskmanager')
          : 'MongoDB Atlas'
        : 'Persisted to data/storage.json'
    }
  });
});

// Serve frontend views
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// 404 handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Fallback to index.html for any other frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Print troubleshooting help
function printFallbackNotice() {
  console.log('\n' + '='.repeat(68));
  console.log('⚡ ZERO-CONFIG LOCAL DATA STORAGE ACTIVE (data/storage.json)');
  console.log('='.repeat(68));
  console.log('Your Task Management Application is 100% operational right now!');
  console.log('User accounts, JWT auth, and task CRUD will persist in data/storage.json.');
  console.log('\nWhen you are ready to connect MongoDB Atlas:');
  console.log('  1. Add your cluster URI to .env: MONGODB_URI=mongodb+srv://...');
  console.log('  2. Set: USE_LOCAL_DB=false');
  console.log('  3. Restart the server. It will automatically switch to Atlas!');
  console.log('='.repeat(68) + '\n');
}

// Connect to Database with Fallback Logic
async function connectDatabase() {
  const useLocalOnly = process.env.USE_LOCAL_DB === 'true';
  const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/taskmanager';
  const atlasUri = process.env.MONGODB_URI;

  // 1. Explicit Local MongoDB Mode
  if (useLocalOnly) {
    console.log(`\n🔄 Attempting connection to Local MongoDB (${localUri})...`);
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      activeDbType = 'local';
      console.log(`✅ Connected successfully to Local MongoDB at ${localUri}`);
      return;
    } catch (err) {
      console.warn(`ℹ️  Local MongoDB is not running (${err.message}).`);
      activeDbType = 'local-fallback';
      printFallbackNotice();
      return;
    }
  }

  // 2. Atlas Connection with Fallback
  const isAtlasPlaceholder =
    !atlasUri ||
    atlasUri.trim() === '' ||
    atlasUri.includes('<username>') ||
    atlasUri.includes('<password>') ||
    atlasUri.includes('cluster0.mongodb.net');

  if (isAtlasPlaceholder) {
    console.log(`🔄 Attempting connection to Local MongoDB (${localUri})...`);
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      activeDbType = 'local';
      console.log(`✅ Connected successfully to Local MongoDB at ${localUri}`);
      return;
    } catch (localErr) {
      activeDbType = 'local-fallback';
      printFallbackNotice();
      return;
    }
  }

  // 3. Connect to valid Atlas URI
  console.log('\n🔄 Attempting connection to MongoDB Atlas...');
  try {
    await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 5000 });
    activeDbType = 'atlas';
    console.log('✅ Connected successfully to MongoDB Atlas database.');
  } catch (atlasErr) {
    console.error(`❌ MongoDB Atlas connection error: ${atlasErr.message}`);
    console.log(`🔄 Attempting connection to Local MongoDB (${localUri})...`);
    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
      activeDbType = 'local';
      console.log(`✅ Connected successfully to Local MongoDB at ${localUri}`);
    } catch (localErr) {
      activeDbType = 'local-fallback';
      printFallbackNotice();
    }
  }
}

// Start Server
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Task Management Application is running!`);
  console.log(`📍 Web Interface: http://localhost:${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Dashboard: http://localhost:${PORT}/dashboard`);

  await connectDatabase();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

module.exports = app;
