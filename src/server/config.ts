const config = {
  node_env: process.env.NODE_ENV || 'dev',
  server: {
    host: process.env.HOST || undefined,
    port: Number(process.env.PORT || 5000),
  },
  mongo: {
    url: process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost/hack24db',
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'password',
  },
  hackbot: {
    password: process.env.HACKBOT_PASSWORD || 'password',
  },
  slack: {
    token: process.env.SLACK_API_TOKEN || undefined,
    apiUrl: process.env.SLACK_API_URL || undefined,
  },
  pusher: {
    url: process.env.PUSHER_URL || undefined,
  },
}

export default config
