require('dotenv').config();
const http = require('http'); 
const app = require('./src/app'); // Our configured Express app
const connectDB = require('./src/config/db'); // Our database connection function
const initializeSocket = require('./src/sockets/socket'); 

// --- 3. Define Server Port ---
// Get the port from the .env file
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log('Successfully connected to MongoDB Atlas!');
    //Initialize Socket.IO
    //initializeSocket(server);
    
    // Only listen on a port in development (not on Vercel)
    if (process.env.NODE_ENV !== 'production') {
      server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error('Error starting server:', error.message);
    process.exit(1);
  }
};

startServer();

// Export for Vercel
module.exports = app;