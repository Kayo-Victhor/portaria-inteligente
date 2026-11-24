import { Request, Response } from "express";
import { UsersService } from "./users.service";

const usersService = new UsersService();

export class UsersController {
  async create(req: Request, res: Response): Promise<void> {
    const user = await usersService.create(req.body);
    res.status(201).json({ user });
  }

  async list(_req: Request, res: Response): Promise<void> {
    const users = await usersService.findAll();
    res.status(200).json({ users });
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const user = await usersService.setActiveStatus(
      req.params.id as string,
      req.user!.sub,
      req.body.isActive,
    );
    res.status(200).json({ user });
  }
}
