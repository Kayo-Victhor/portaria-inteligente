import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { globalErrorHandler } from "./middlewares/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";
import { unitsRoutes } from "./modules/units/units.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { passesRoutes } from "./modules/passes/passes.routes";
import { deliveriesRoutes } from "./modules/deliveries/deliveries.routes";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/units", unitsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/passes", passesRoutes);
app.use("/api/deliveries", deliveriesRoutes);

app.use(globalErrorHandler);

export { app };
