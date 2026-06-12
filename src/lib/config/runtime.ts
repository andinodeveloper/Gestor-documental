export const runtimeConfig = {
  authMode: process.env.AUTH_MODE === "database" ? "database" : "local",
  identityFields: ["username", "email", "dui"],
  database: "sqlserver-ready",
  storage: "local-adapter",
  aiProvider: "openai-adapter",
  vectorLayer: "provider-agnostic",
};

export const stackStatus = [
  "SQL Server ready",
  "Storage local adapter",
  "OpenAI adapter",
  "ACL unificada",
] as const;
