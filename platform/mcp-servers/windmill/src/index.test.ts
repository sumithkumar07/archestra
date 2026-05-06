import { describe, it, expect } from "vitest";
import { WindmillMcpServer } from "./index";

describe("WindmillMcpServer", () => {
  it("should be instantiable", () => {
    const server = new WindmillMcpServer();
    expect(server).toBeDefined();
  });
});
