import { ConflictError } from "../../../lib/errors.js";

export const LAND_STATUSES = ["draft", "active", "partially_sold", "sold_out", "closed"] as const;
export type LandStatus = (typeof LAND_STATUSES)[number];

export interface StatusTransitionInput {
  currentStatus: string;
  requestedStatus: string;
  availableSak: number;
  totalSakInventory: number;
}

export interface StatusTransitionResult {
  allowed: boolean;
  edgeCase: boolean;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "closed"],
  active: ["partially_sold", "closed"],
  partially_sold: ["sold_out", "closed"],
  sold_out: ["active", "closed"],
  closed: [],
};

function isTransitionAllowed(current: string, requested: string): boolean {
  const targets = ALLOWED_TRANSITIONS[current] ?? [];
  return targets.includes(requested);
}

function meetsPreconditions(input: StatusTransitionInput): boolean {
  const { currentStatus, requestedStatus, availableSak, totalSakInventory } = input;
  if (requestedStatus === "closed") return true;

  if (currentStatus === "draft" && requestedStatus === "active") {
    return availableSak > 0;
  }
  if (currentStatus === "active" && requestedStatus === "partially_sold") {
    return availableSak > 0 && availableSak < totalSakInventory;
  }
  if (currentStatus === "partially_sold" && requestedStatus === "sold_out") {
    return availableSak === 0;
  }
  if (currentStatus === "sold_out" && requestedStatus === "active") {
    return availableSak > 0;
  }
  return true;
}

/**
 * BR-019: Enforces the only legal land status transitions. Throws ConflictError
 * on any disallowed transition.
 */
export function assertLandStatusTransition(input: StatusTransitionInput): StatusTransitionResult {
  const { currentStatus, requestedStatus } = input;

  if (currentStatus === requestedStatus) {
    return { allowed: true, edgeCase: false };
  }

  const transitionAllowed = isTransitionAllowed(currentStatus, requestedStatus);
  if (!transitionAllowed) {
    throw new ConflictError(
      `Status transition from "${currentStatus}" to "${requestedStatus}" is not allowed`,
    );
  }

  const preconditionsMet = meetsPreconditions(input);
  if (!preconditionsMet) {
    throw new ConflictError(
      `Status transition from "${currentStatus}" to "${requestedStatus}" is not allowed in the current inventory state`,
    );
  }

  return {
    allowed: true,
    edgeCase: currentStatus === "sold_out" && requestedStatus === "active",
  };
}
