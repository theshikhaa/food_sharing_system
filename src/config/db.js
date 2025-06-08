const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Increase timeout
            socketTimeoutMS: 45000,
            family: 4 // Use IPv4
        });
        
        console.log('MongoDB Connected Successfully');
        
        // Add connection event handlers
        mongoose.connection.on('error', (error) => {
            console.error('MongoDB Connection Error:', error);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectDB, 5000); // Retry connection
    }
};

module.exports = connectDB;