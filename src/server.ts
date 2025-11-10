import 'dotenv/config';
import { buildApp } from './app.js';

const start = async () => {
  try {
    const app = await buildApp();

    const port = parseInt(app.config.PORT, 10);
    const host = app.config.HOST;

    await app.listen({ port, host });

    app.log.info(`🚀 Server listening on ${host}:${port}`);
    app.log.info(`📚 Docs available at http://${host}:${port}/docs`);
    app.log.info(`📊 Metrics available at http://${host}:${port}/metrics`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
