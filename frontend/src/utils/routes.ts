import type { Role } from "../types";

export function getHomeRouteByRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CONCIERGE":
      return "/portaria";
    case "RESIDENT":
      return "/morador";
  }
}
