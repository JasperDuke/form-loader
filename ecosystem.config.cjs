module.exports = {
  apps: [
    {
      name: "convoy-api",
      cwd: "./apps/api",
      script: "npm",
      args: "run start",
      interpreter: "none",
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
      script: "npm",
      args: "run start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 3019,
        NEXT_PUBLIC_API_URL: "https://api-form.atenxion.ai",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
