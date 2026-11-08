import { describe, expect, it } from "vite-plus/test";
import { singleFlight } from "@/lib/utils/single-flight";

describe("singleFlight", () => {
  it("shares one in-flight promise between concurrent callers", async () => {
    let calls = 0;
    let release: (value: string) => void = () => {};
    const gate = new Promise<string>((resolve) => {
      release = resolve;
    });

    const task = (): Promise<string> => {
      calls += 1;
      return gate;
    };

    const first = singleFlight("shared-key", task);
    const second = singleFlight("shared-key", task);

    expect(first).toBe(second);

    release("done");
    await expect(first).resolves.toBe("done");
    expect(calls).toBe(1);
  });

  it("runs the task again after the previous one settles", async () => {
    let calls = 0;
    const task = async (): Promise<number> => {
      calls += 1;
      return calls;
    };

    await expect(singleFlight("fresh-key", task)).resolves.toBe(1);
    await expect(singleFlight("fresh-key", task)).resolves.toBe(2);
    expect(calls).toBe(2);
  });

  it("clears the in-flight entry when the task rejects", async () => {
    let calls = 0;
    const failing = async (): Promise<never> => {
      calls += 1;
      throw new Error("boom");
    };

    await expect(singleFlight("failing-key", failing)).rejects.toThrow("boom");

    const succeeding = async (): Promise<string> => "ok";
    await expect(singleFlight("failing-key", succeeding)).resolves.toBe("ok");
    expect(calls).toBe(1);
  });

  it("isolates different keys", async () => {
    const first = singleFlight("key-a", async () => "a");
    const second = singleFlight("key-b", async () => "b");

    await expect(first).resolves.toBe("a");
    await expect(second).resolves.toBe("b");
  });
});
