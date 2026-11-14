import { Router } from "express";
import { integrationStatus } from "../config/env";
import adminRoutes from "./admin.routes";
import aiRoutes from "./ai.routes";
import authRoutes from "./auth.routes";
import carbonRoutes from "./carbon.routes";
import emergencyRoutes from "./emergency.routes";
import journeysRoutes from "./journeys.routes";
import routingRoutes from "./routing.routes";
import safetyRoutes from "./safety.routes";
import weatherRoutes from "./weather.routes";

const apiV1Router = Router();

apiV1Router.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      service: "SKYGO Backend API v1",
      status: "healthy",
      timezone: "Asia/Kolkata",
      currency: "INR",
      integrations: integrationStatus,
      timestamp: new Date().toISOString()
    },
    message: "SKYGO API is operational"
  });
});

apiV1Router.use("/auth", authRoutes);
apiV1Router.use("/journeys", journeysRoutes);
apiV1Router.use("/routing", routingRoutes);
apiV1Router.use("/safety", safetyRoutes);
apiV1Router.use("/emergency", emergencyRoutes);
apiV1Router.use("/weather", weatherRoutes);
apiV1Router.use("/carbon", carbonRoutes);
apiV1Router.use("/ai", aiRoutes);
apiV1Router.use("/admin", adminRoutes);

export default apiV1Router;
