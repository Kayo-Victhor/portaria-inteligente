import { Router } from "express";
import { PassesController } from "./passes.controller";
import { ensureAuthenticated } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  createPassSchema,
  passCodeParamSchema,
  passIdParamSchema,
  registerAccessSchema,
} from "./passes.schema";

const passesRoutes = Router();
const passesController = new PassesController();

passesRoutes.use(ensureAuthenticated);

// Rotas exclusivas do Morador (RESIDENT)
passesRoutes.post(
  "/",
  authorizeRoles("RESIDENT"),
  validateRequest({ body: createPassSchema }),
  passesController.create,
);

passesRoutes.get(
  "/my-unit",
  authorizeRoles("RESIDENT"),
  passesController.listMyUnitPasses,
);

passesRoutes.patch(
  "/:id/revoke",
  authorizeRoles("RESIDENT"),
  validateRequest({ params: passIdParamSchema }),
  passesController.revoke,
);

// Rotas operacionais da Portaria (CONCIERGE e ADMIN)
passesRoutes.get(
  "/check/:code",
  authorizeRoles("CONCIERGE", "ADMIN"),
  validateRequest({ params: passCodeParamSchema }),
  passesController.checkCode,
);

passesRoutes.post(
  "/access",
  authorizeRoles("CONCIERGE", "ADMIN"),
  validateRequest({ body: registerAccessSchema }),
  passesController.registerAccess,
);

passesRoutes.get(
  "/logs",
  authorizeRoles("CONCIERGE", "ADMIN"),
  passesController.listLogs,
);

export { passesRoutes };
