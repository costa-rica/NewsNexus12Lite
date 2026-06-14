import type { SessionObject } from "./index";

declare global {
  namespace Express {
    interface Locals {
      session: SessionObject;
    }
  }
}
