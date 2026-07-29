// pm2 process config — auto-restarts the API if it crashes.
// Usage: npx pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'novel-platform-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
