import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ ipcMain: { handle: vi.fn() } }));

import { listSshConfigHosts } from "./ssh-config.js";

function fakeFs(files: Record<string, string>) {
  return {
    readFile: (filePath: string) => files[filePath] ?? null,
    listDirectory: (directory: string) =>
      Object.keys(files)
        .filter((filePath) => filePath.startsWith(`${directory}/`))
        .map((filePath) => filePath.slice(directory.length + 1)),
  };
}

describe("listSshConfigHosts", () => {
  it("lists concrete aliases with HostName and User, following Include globs", () => {
    const fs = fakeFs({
      "/home/me/.ssh/config": [
        "Include config.d/*",
        "Host ubuntu-ts ubuntu",
        "  HostName 100.84.80.69",
        "  User wangfh",
        "Host *",
        "  User nobody",
        "Match host foo",
        "  User ignored",
      ].join("\n"),
      "/home/me/.ssh/config.d/macs": "Host=macmini-ts\n  HostName=100.72.72.76\nHost !bad mba-*",
    });

    expect(listSshConfigHosts({ homeDirectory: "/home/me", fs })).toEqual([
      { alias: "macmini-ts", hostName: "100.72.72.76" },
      { alias: "ubuntu-ts", hostName: "100.84.80.69", user: "wangfh" },
      { alias: "ubuntu", hostName: "100.84.80.69", user: "wangfh" },
    ]);
  });

  it("returns nothing without a config and survives include cycles", () => {
    expect(listSshConfigHosts({ homeDirectory: "/none", fs: fakeFs({}) })).toEqual([]);
    const fs = fakeFs({ "/h/.ssh/config": "Include config\nHost a" });
    expect(listSshConfigHosts({ homeDirectory: "/h", fs })).toEqual([{ alias: "a" }]);
  });
});
