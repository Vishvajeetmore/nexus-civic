import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB } from '@nexus-civic/db';

import workersRoutes from './routes/workers.routes';
import listingsRoutes from './routes/listings.routes';
import upskillingRoutes from './routes/upskilling.routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/workers', workersRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/upskilling', upskillingRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'gig-forge',
    dbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling
app.use(errorHandler);

// Database Connection & Server Start
const startServer = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-civic';
    await connectDB(uri);
    console.log('Connected to MongoDB via @nexus-civic/db');
    
    app.listen(port, () => {
      console.log(`GigForge Service running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start GigForge Service:', error);
    process.exit(1);
  }
};

startServer();
