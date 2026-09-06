module.exports = {
  apps: [
    {
      name: "lijst-van-andel",
      script: "./dist/server.cjs",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
