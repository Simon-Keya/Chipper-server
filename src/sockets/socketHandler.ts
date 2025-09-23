import { Server } from 'socket.io';
import logger from '../utils/logger';

export const initSocket = (io: Server) => {
  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });
    socket.on('disconnect', () => logger.info('Client disconnected', { socketId: socket.id }));
  });
};