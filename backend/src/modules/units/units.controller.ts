import { Request, Response } from "express";
import { UnitsService } from "./units.service";

const unitsService = new UnitsService();

export class UnitsController {
  async create(req: Request, res: Response): Promise<void> {
    const unit = await unitsService.create(req.body);
    res.status(201).json({ unit });
  }

  async list(_req: Request, res: Response): Promise<void> {
    const units = await unitsService.findAll();
    res.status(200).json({ units });
  }

  async show(req: Request, res: Response): Promise<void> {
    const unit = await unitsService.findById(req.params.id as string);
    res.status(200).json({ unit });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await unitsService.delete(req.params.id as string);
    res.status(204).send();
  }
}
