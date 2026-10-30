import { functionA } from "./a";

export function functionB(): string {
  return "B" + functionA();
}