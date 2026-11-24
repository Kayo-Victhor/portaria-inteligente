export type Role = "ADMIN" | "CONCIERGE" | "RESIDENT";

export interface Unit {
  id: string;
  block: string;
  number: string;
  _count?: {
    residents: number;
    deliveries: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  unit: Pick<Unit, "id" | "block" | "number"> | null;
}

export type VisitorType = "GUEST" | "SERVICE_PROVIDER" | "DELIVERY_COURIER";
export type PassStatus = "ACTIVE" | "USED" | "EXPIRED" | "REVOKED";

export interface VisitorPass {
  id: string;
  code: string;
  visitorName: string;
  visitorDocument: string | null;
  visitorType: VisitorType;
  singleUse: boolean;
  validFrom: string;
  validUntil: string;
  status: PassStatus;
  createdAt: string;
  unit?: Pick<Unit, "block" | "number">;
  createdBy?: { id: string; name: string };
}

export type DeliveryStatus = "PENDING" | "PICKED_UP";

export interface Delivery {
  id: string;
  trackingCode: string | null;
  carrier: string;
  description: string | null;
  status: DeliveryStatus;
  receivedAt: string;
  pickedUpAt: string | null;
  pickedUpBy: string | null;
  unit: Pick<Unit, "id" | "block" | "number">;
  receivedBy: { id: string; name: string };
}
