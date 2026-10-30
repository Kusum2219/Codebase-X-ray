import { functionB } from "./b";

export function functionA(): string {
  return "A" + functionB();
}