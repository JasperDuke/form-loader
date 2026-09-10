module.exports = {
  apps: [
    {
      name: "convoy-api",
      cwd: "./apps/api",
      script: "src/index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        API_PORT: 3020,
      },
      max_memory_restart: "512M",
      time: true,
    },
    {
      name: "convoy-web",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start --port 3019",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3019,
        HOSTNAME: "0.0.0.0",
        NEXT_PUBLIC_API_URL: "https://api-form.atenxion.ai",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
