import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from '@nexus-civic/db';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { detectClusters } from './utils/clustering';

import postsRoutes from './routes/posts.routes';
import factcheckRoutes from './routes/factcheck.routes';
import briefingRoutes from './routes/briefing.routes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'civic-pulse', timestamp: new Date() });
});

app.use('/api/posts', postsRoutes);
app.use('/api/factcheck', factcheckRoutes);
app.use('/api/briefing', briefingRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-civic');
    logger.info('Connected to MongoDB');

    setInterval(detectClusters, 15 * 60 * 1000);

    app.listen(PORT, () => {
      logger.info(`Civic-Pulse microservice running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
