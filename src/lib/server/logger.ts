import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
	...(!isProduction && { transport: { target: 'pino-pretty' } })
});

// Child loggers for each subsystem
export const dbLogger = logger.child({ component: 'drizzle' });
export const authLogger = logger.child({ component: 'auth' });
export const socketLogger = logger.child({ component: 'socket.io' });
export const apiLogger = logger.child({ component: 'api' });
export const gameLogger = logger.child({ component: 'game' });
