import { Router } from "express";
import { ensureAuthenticated } from "../../middlewares/auth.middleware";
import { authorizeRoles } from "../../middlewares/rbac.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { OccurrencesController } from "./occurrences.controller";
import {
  createOccurrenceSchema,
  occurrenceIdParamSchema,
} from "./occurrences.schema";

const occurrencesRoutes = Router();
const occurrencesController = new OccurrencesController();

occurrencesRoutes.use(
  ensureAuthenticated,
  authorizeRoles("CONCIERGE", "ADMIN"),
);

occurrencesRoutes.get("/", occurrencesController.list);

occurrencesRoutes.post(
  "/",
  validateRequest({ body: createOccurrenceSchema }),
  occurrencesController.create,
);

occurrencesRoutes.patch(
  "/:id/resolve",
  validateRequest({ params: occurrenceIdParamSchema }),
  occurrencesController.toggleResolve,
);

export { occurrencesRoutes };
