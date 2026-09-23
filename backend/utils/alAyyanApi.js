const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();

// alAyyan.controller.js hardcodes "/api/AgentApi/..." on every request path,
// so the base URL must be the bare origin. Strip a trailing "/api" in case
// AL_AYYAN_API_URL is configured with it already (mirrors the normalisation
// fzPakistanApi.js/ammerMilatApi.js do for their own base-URL env vars).
export const getAlAyyanApiBaseUrl = () => {
  const baseUrl = getEnv("AL_AYYAN_API_URL").replace(/\/+$/, "");
  return baseUrl.replace(/\/api$/i, "");
};

export const getAlAyyanEnv = getEnv;
