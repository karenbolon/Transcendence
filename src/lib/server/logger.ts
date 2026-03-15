import pino from 'pino';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info'
});

// Child loggers for each subsystem
export const dbLogger = logger.child({ component: 'drizzle' });
export const authLogger = logger.child({ component: 'auth' });
export const socketLogger = logger.child({ component: 'socket.io' });
export const apiLogger = logger.child({ component: 'api' });
