import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel): boolean {
  if (env.NODE_ENV === "test") return level === "error";
  const current = (env.LOG_LEVEL as LogLevel) || "info";
  return levelPriority[level] >= levelPriority[current];
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(JSON.stringify({ timestamp: new Date().toISOString(), level: "DEBUG", message, ...meta }));
    }
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(JSON.stringify({ timestamp: new Date().toISOString(), level: "INFO", message, ...meta }));
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "WARN", message, ...meta }));
    }
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "ERROR", message, ...meta }));
    }
  }
};
