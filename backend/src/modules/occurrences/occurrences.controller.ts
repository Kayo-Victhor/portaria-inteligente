import { Request, Response } from "express";
import { OccurrencesService } from "./occurrences.service";
import {
  createOccurrenceSchema,
  occurrenceIdParamSchema,
} from "./occurrences.schema";

const occurrencesService = new OccurrencesService();

export class OccurrencesController {
  async list(req: Request, res: Response) {
    const onlyPending = req.query.pending === "true";
    const occurrences = await occurrencesService.list(onlyPending);
    return res.json({ occurrences });
  }

  async create(req: Request, res: Response) {
    const data = createOccurrenceSchema.parse(req.body);
    const occurrence = await occurrencesService.create(data, req.user!.sub);
    return res.status(201).json({ occurrence });
  }

  async toggleResolve(req: Request, res: Response) {
    const { id } = occurrenceIdParamSchema.parse(req.params);
    const occurrence = await occurrencesService.toggleResolve(
      id,
      req.user!.sub,
    );
    return res.json({ occurrence });
  }
}
