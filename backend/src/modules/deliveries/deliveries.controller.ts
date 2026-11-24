import { Request, Response } from 'express';
import { DeliveryStatus } from '@prisma/client';
import { DeliveriesService } from './deliveries.service';

const deliveriesService = new DeliveriesService();

export class DeliveriesController {
  async create(req: Request, res: Response): Promise<void> {
    const result = await deliveriesService.create(req.body, req.user!.sub);
    res.status(201).json(result);
  }

  async listAll(req: Request, res: Response): Promise<void> {
    const status = req.query.status as DeliveryStatus | undefined;
    const deliveries = await deliveriesService.listAll(status);
    res.status(200).json({ deliveries });
  }

  async listMyUnit(req: Request, res: Response): Promise<void> {
    const status = req.query.status as DeliveryStatus | undefined;
    const deliveries = await deliveriesService.listByUnit(req.user!.unitId!, status);
    res.status(200).json({ deliveries });
  }

  async regeneratePin(req: Request, res: Response): Promise<void> {
    const result = await deliveriesService.regeneratePin(
      req.params.id as string,
      req.user!.unitId!
    );
    res.status(200).json(result);
  }

  async confirmPickup(req: Request, res: Response): Promise<void> {
    const delivery = await deliveriesService.confirmPickup(
      req.params.id as string,
      req.body
    );
    res.status(200).json({ delivery });
  }
}