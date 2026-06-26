export const env = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.BACKEND_PORT ?? 3001),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
    refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 604800),
  },
  bcryptCost: Number(process.env.BCRYPT_COST ?? 12),
  ai: {
    encryptionKey: process.env.AI_SECRET_ENCRYPTION_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    groqVisionModel: process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    ollamaVisionModel: process.env.OLLAMA_VISION_MODEL ?? 'llava:latest',
  },
});
