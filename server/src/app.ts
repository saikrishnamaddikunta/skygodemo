import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import apiV1Router from "./routes";

export const app = express();

app.use(helmet());

const allowedOrigins = [
  process.env.CLIENT_URL,
  env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173"
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === "test" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests from this IP, please try again shortly.",
      details: []
    }
  }
});

app.use("/api/v1", apiLimiter, apiV1Router);
app.use("/v1", apiLimiter, apiV1Router);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: "The requested API endpoint does not exist",
      details: []
    }
  });
});

app.use(errorHandler);

export default app;
