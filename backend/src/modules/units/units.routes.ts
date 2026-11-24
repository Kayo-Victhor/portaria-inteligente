import { Router } from "express";
import { UnitsController } from "./units.controller";
import { ensureAuthenticated } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { createUnitSchema, unitIdParamSchema } from "./units.schema";

const unitsRoutes = Router();
const unitsController = new UnitsController();

unitsRoutes.use(ensureAuthenticated);

// Admin e Portaria podem listar unidades (Portaria precisa para registrar encomendas)
unitsRoutes.get(
  "/",
  authorizeRoles("ADMIN", "CONCIERGE"),
  unitsController.list,
);

unitsRoutes.get(
  "/:id",
  authorizeRoles("ADMIN", "CONCIERGE"),
  validateRequest({ params: unitIdParamSchema }),
  unitsController.show,
);

// Apenas Admin cria ou exclui unidades
unitsRoutes.post(
  "/",
  authorizeRoles("ADMIN"),
  validateRequest({ body: createUnitSchema }),
  unitsController.create,
);

unitsRoutes.delete(
  "/:id",
  authorizeRoles("ADMIN"),
  validateRequest({ params: unitIdParamSchema }),
  unitsController.remove,
);

export { unitsRoutes };
