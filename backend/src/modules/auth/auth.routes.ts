import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate.middleware";
import { ensureAuthenticated } from "../../middlewares/auth.middleware";
import { loginSchema } from "./auth.schema";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post(
  "/login",
  validateRequest({ body: loginSchema }),
  authController.login,
);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authController.logout);
authRoutes.get("/me", ensureAuthenticated, authController.me);

export { authRoutes };
