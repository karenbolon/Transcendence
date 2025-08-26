import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(helmet);

app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/hello', async () => ({ msg: 'Hello from Fastify' }));

const port = NUMBER(process.env.PORT) || 3000;
const host = '0.0.0.0';

try {
	await app.listen({ port, host });
	app.log.info('listening on ${port}');
} catch (err) {
	app.log.error(err);
	process.exit(1);
}