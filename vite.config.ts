import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { loadEnv } from 'vite';
import pino from 'pino';

const socketLog = pino({ level: process.env.LOG_LEVEL || 'info' }).child({ component: 'socket.io' });

function socketIODevPlugin() {
	let ioAttached = false;

	return {
		name: 'socket-io-dev',
		configureServer: {
			order: 'pre' as const,
			handler(server: any) {
				if (!server.httpServer) return;

				server.httpServer.once('listening', async () => {
					if (ioAttached) return;
					ioAttached = true;

					try {
						const { initSocketIO } = await server.ssrLoadModule('$lib/server/socket/index.ts');
						const { socketAuthMiddleware, registerPresence } = await server.ssrLoadModule('$lib/server/socket/auth.ts');
						const { registerFriendHandlers } = await server.ssrLoadModule('$lib/server/socket/handlers/friends.ts');
						const { registerGameHandlers } = await server.ssrLoadModule('$lib/server/socket/handlers/game.ts');

						const io = initSocketIO(server.httpServer!);
						io.use(socketAuthMiddleware);

						io.on('connection', (socket: any) => {
							socketLog.info({ userId: socket.data.userId, socketId: socket.id }, 'User connected');
							registerPresence(socket);
							registerFriendHandlers(socket);
							registerGameHandlers(socket);

							socket.on('disconnect', () => {
								socketLog.info({ userId: socket.data.userId, socketId: socket.id }, 'User disconnected');
							});
						});

						socketLog.info('Attached to Vite dev server');
					} catch (err) {
						socketLog.error({ err }, 'Failed to attach to dev server');
					}
				});
			},
		},
	};
}

export default defineConfig(({ mode }) => ({
	plugins: [socketIODevPlugin(), tailwindcss(), sveltekit()],

	test: {
		env: loadEnv('test', process.cwd(), ''),
		setupFiles: ['src/lib/server/db/test_db/vitest.setup.ts'],
		fileParallelism: false,

		expect: { requireAssertions: true },

		projects: [
			// {
			// 	extends: './vite.config.ts',

			// 	test: {
			// 		name: 'client',

			// 		browser: {
			// 			enabled: true,
			// 			provider: playwright(),
			// 			instances: [{ browser: 'chromium', headless: true }]
			// 		},

			// 		include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
			// 		exclude: ['src/lib/server/**']
			// 	}
			// },

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
}));
