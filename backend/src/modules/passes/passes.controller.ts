import { Request, Response } from "express";
import { PassesService } from "./passes.service";

const passesService = new PassesService();

export class PassesController {
  // Morador cria convite para sua unidade
  async create(req: Request, res: Response): Promise<void> {
    const pass = await passesService.create(
      req.body,
      req.user!.sub,
      req.user!.unitId!,
    );
    res.status(201).json({ pass });
  }

  // Morador lista convites da sua unidade
  async listMyUnitPasses(req: Request, res: Response): Promise<void> {
    const passes = await passesService.listByUnit(req.user!.unitId!);
    res.status(200).json({ passes });
  }

  // Morador revoga um convite ativo da sua unidade
  async revoke(req: Request, res: Response): Promise<void> {
    const pass = await passesService.revoke(
      req.params.id as string,
      req.user!.unitId!,
    );
    res.status(200).json({ pass });
  }

  // Portaria/Admin consulta dados e validade do código
  async checkCode(req: Request, res: Response): Promise<void> {
    const result = await passesService.checkByCode(req.params.code as string);
    res.status(200).json(result);
  }

  // Portaria registra entrada ou saída
  async registerAccess(req: Request, res: Response): Promise<void> {
    const result = await passesService.registerAccess(req.body, req.user!.sub);
    res.status(201).json(result);
  }

  // Portaria/Admin consulta histórico recente da portaria
  async listLogs(_req: Request, res: Response): Promise<void> {
    const logs = await passesService.listRecentLogs();
    res.status(200).json({ logs });
  }
}
