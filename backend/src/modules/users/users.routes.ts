import { Router } from "express";
import { UsersController } from "./users.controller";
import { ensureAuthenticated } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  createUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from "./users.schema";

const usersRoutes = Router();
const usersController = new UsersController();

// Todo o módulo de gestão de usuários é restrito ao ADMIN
usersRoutes.use(ensureAuthenticated, authorizeRoles("ADMIN"));

usersRoutes.get("/", usersController.list);

usersRoutes.post(
  "/",
  validateRequest({ body: createUserSchema }),
  usersController.create,
);

usersRoutes.patch(
  "/:id/status",
  validateRequest({ params: userIdParamSchema, body: updateUserStatusSchema }),
  usersController.updateStatus,
);

export { usersRoutes };
