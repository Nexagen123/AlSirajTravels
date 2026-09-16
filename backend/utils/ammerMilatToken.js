import axios from "axios";
import AmmerMilatToken from "../models/AmmerMilatToken.js";
import { getAmmerMilatApiBaseUrl, getAmmerMilatEnv } from "./ammerMilatApi.js";

/**
 * Decodes a JWT's payload (without verifying the signature — we don't hold
 * Ameer-e-Millat's signing key, we just need the `exp` claim) so we know
 * when a token needs refreshing instead of guessing a TTL.
 */
const decodeJwtExpiry = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));

    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
};

/**
 * Returns a valid Ameer-e-Millat API token.
 *
 * Ameer-e-Millat only allows ONE active token per account at a time — calling
 * `/api/login` while a token is still valid fails with "You already have a
 * valid token which valid for a year" instead of issuing a new one. So the
 * order here matters:
 *   1. Use whatever we've already cached in the DB, if still valid.
 *   2. Otherwise, prefer the long-lived static `AmmerMilat_API_Token` from
 *      .env if it's still valid (decoded from its own JWT `exp`) — this is
 *      the common case and avoids ever calling their login endpoint.
 *   3. Only call `/api/login` when neither of the above holds (e.g. the
 *      static token has actually expired and nothing is cached).
 * Any static/cached token we end up using is written back to the DB cache
 * so subsequent calls take the fast path instead of re-deciding this.
 */
export const getValidAmmerMilatToken = async () => {
  const existing = await AmmerMilatToken.findOne().sort({ createdAt: -1 });

  if (existing?.token && existing.expiry > new Date(Date.now() + 60000)) {
    return existing.token;
  }

  const staticToken = getAmmerMilatEnv("AmmerMilat_API_Token");
  const staticExpiry = staticToken ? decodeJwtExpiry(staticToken) : null;

  if (staticToken && (!staticExpiry || staticExpiry > new Date(Date.now() + 60000))) {
    await AmmerMilatToken.deleteMany({});
    await AmmerMilatToken.create({
      token: staticToken,
      expiry: staticExpiry || new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return staticToken;
  }

  const baseUrl = getAmmerMilatApiBaseUrl();
  const email = getAmmerMilatEnv("AmmerMilat_API_Email");
  const password = getAmmerMilatEnv("AmmerMilat_API_Password");

  try {
    if (!baseUrl || !email || !password) {
      throw new Error("Ameer-e-Millat login credentials are not configured");
    }

    // Their /api/login endpoint takes multipart form-data (email, password);
    // Laravel parses url-encoded scalar fields the same way, so this avoids
    // pulling in the `form-data` package just for two text fields.
    const body = new URLSearchParams({ email, password });

    const response = await axios.post(`${baseUrl}/login`, body, {
      headers: { Accept: "application/json" },
    });

    const newToken = response.data?.token;
    if (!newToken) {
      throw new Error("Login failed: no token in response");
    }

    const expiryDate =
      decodeJwtExpiry(newToken) ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day fallback TTL

    await AmmerMilatToken.deleteMany({});
    await AmmerMilatToken.create({ token: newToken, expiry: expiryDate });

    console.log("Successfully refreshed Ameer-e-Millat token");
    return newToken;
  } catch (error) {
    console.error(
      "Error fetching Ameer-e-Millat token:",
      error.response?.data || error.message,
    );

    // Last resort: use the static token even if we couldn't confirm/refresh
    // it, in case our expiry decoding was wrong rather than the token itself.
    if (staticToken) {
      console.warn("Falling back to static AmmerMilat_API_Token from .env");
      return staticToken;
    }

    throw new Error("Failed to authenticate with Ameer-e-Millat API");
  }
};

/**
 * Ensures a valid Ameer-e-Millat token exists (cached or freshly logged in)
 * at startup, mirroring the FZ Pakistan token bootstrap.
 */
export const initializeAmmerMilatToken = async () => {
  try {
    await getValidAmmerMilatToken();
    console.log("Ameer-e-Millat token initialized");
  } catch (error) {
    console.warn("Ameer-e-Millat token initialization failed:", error.message);
  }
};
