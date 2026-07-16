/**
 * PM2 process definition.
 *
 *   Development : pm2 start ecosystem.config.js --only keventers-api-dev
 *   Production  : pm2 start ecosystem.config.js --env production --only keventers-api
 *   Zero-downtime reload (cluster) : pm2 reload keventers-api
 */
export default {
  apps: [
    {
      name: 'keventers-api',
      script: 'src/server.js',
      exec_mode: 'cluster',
      instances: 'max',
      autorestart: true,
      max_memory_restart: '512M',
      // Graceful reloads: PM2 sends SIGINT and waits for our shutdown handler.
      kill_timeout: 12000,
      wait_ready: true,
      listen_timeout: 15000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'keventers-worker',
      script: 'src/worker.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      kill_timeout: 12000,
      wait_ready: true,
      listen_timeout: 15000,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'keventers-api-dev',
      script: 'src/server.js',
      exec_mode: 'fork',
      instances: 1,
      watch: ['src'],
      ignore_watch: ['node_modules', 'logs'],
      autorestart: true,
      kill_timeout: 12000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
    },
  ],
};
