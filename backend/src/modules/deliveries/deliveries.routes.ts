import { Router } from 'express';
import { DeliveriesController } from './deliveries.controller';
import { ensureAuthenticated } from '../../middlewares/auth.middleware';
import { authorizeRoles } from '../../middlewares/rbac.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import {
  createDeliverySchema,
  deliveryIdParamSchema,
  listDeliveriesQuerySchema,
  pickupDeliverySchema,
} from './deliveries.schema';

const deliveriesRoutes = Router();
const deliveriesController = new DeliveriesController();

deliveriesRoutes.use(ensureAuthenticated);

// Rotas do Morador (RESIDENT)
deliveriesRoutes.get(
  '/my-unit',
  authorizeRoles('RESIDENT'),
  validateRequest({ query: listDeliveriesQuerySchema }),
  deliveriesController.listMyUnit
);

deliveriesRoutes.post(
  '/:id/regenerate-pin',
  authorizeRoles('RESIDENT'),
  validateRequest({ params: deliveryIdParamSchema }),
  deliveriesController.regeneratePin
);

// Rotas da Portaria e Administração (CONCIERGE e ADMIN)
deliveriesRoutes.post(
  '/',
  authorizeRoles('CONCIERGE', 'ADMIN'),
  validateRequest({ body: createDeliverySchema }),
  deliveriesController.create
);

deliveriesRoutes.get(
  '/',
  authorizeRoles('CONCIERGE', 'ADMIN'),
  validateRequest({ query: listDeliveriesQuerySchema }),
  deliveriesController.listAll
);

deliveriesRoutes.patch(
  '/:id/pickup',
  authorizeRoles('CONCIERGE', 'ADMIN'),
  validateRequest({ params: deliveryIdParamSchema, body: pickupDeliverySchema }),
  deliveriesController.confirmPickup
);

export { deliveriesRoutes };