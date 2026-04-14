/**
 * PM2 Ecosystem Configuration for Slaytim.com Backend
 *
 * Run with:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 *
 * Processes:
 *   1. api       — Express.js HTTP server (cluster mode, N workers)
 *   2. worker    — BullMQ conversion worker (fork mode, 1 process)
 *   3. monitor   — Stuck job monitor (fork mode, 1 process)
 */

module.exports = {
  apps: [
    {
      name: 'slaytim-api',
      script: 'src/index.js',
      cwd: __dirname,
      instances: process.env.API_INSTANCES || 'max',  // cluster across all CPUs
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100,

      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },

      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,  // wait for process.send('ready')
      listen_timeout: 15000,

      // Log management
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
      merge_logs: true,

      // Health check
      health_check_url: 'http://localhost:5001/api/health',
      health_check_interval: 30000,
      health_check_fatal_threshold: 3,

      // Node.js flags for production
      node_args: '--max-old-space-size=512',
    },

    {
      name: 'slaytim-worker',
      script: 'src/workers/conversion.worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '15s',
      exp_backoff_restart_delay: 200,

      env: {
        NODE_ENV: 'development',
        REDIS_ENABLED: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_ENABLED: 'true',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      merge_logs: true,
    },

    {
      name: 'slaytim-monitor',
      script: 'src/workers/stuck-job-monitor.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '128M',
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '10s',

      env: {
        NODE_ENV: 'development',
        REDIS_ENABLED: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_ENABLED: 'true',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/monitor-error.log',
      out_file: 'logs/monitor-out.log',
      merge_logs: true,
    },
  ],
};
