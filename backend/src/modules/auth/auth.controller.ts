import { Request, Response, CookieOptions } from "express";
import { env } from "../../config/env";
import { AuthService } from "./auth.service";
import { AppError } from "../../errors/AppError";

const authService = new AuthService();

const isProduction = env.NODE_ENV === "production";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
};

function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
) {
  res.cookie("access_token", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000, // 15 minutos
  });

  res.cookie("refresh_token", refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", baseCookieOptions);
  res.clearCookie("refresh_token", baseCookieOptions);
}

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
    );

    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({ user });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const currentRefreshToken = req.cookies?.refresh_token;

    if (!currentRefreshToken) {
      clearAuthCookies(res);
      throw new AppError("Refresh token ausente.", 401);
    }

    try {
      const { user, accessToken, refreshToken } =
        await authService.refresh(currentRefreshToken);

      setAuthCookies(res, accessToken, refreshToken);

      res.status(200).json({ user });
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const currentRefreshToken = req.cookies?.refresh_token;

    await authService.logout(currentRefreshToken);
    clearAuthCookies(res);

    res.status(204).send();
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.sub);
    res.status(200).json({ user });
  }
}
