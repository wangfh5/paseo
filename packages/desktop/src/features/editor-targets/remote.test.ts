import { describe, expect, it } from "vitest";

import { buildRemoteSshOpenUrl, supportsRemoteSsh } from "./remote.js";

describe("remote SSH editor URLs", () => {
  it("opens a folder on an ssh alias in a new VS Code window", () => {
    expect(
      buildRemoteSshOpenUrl({
        editorId: "vscode",
        host: "ubuntu-ts",
        workspacePath: "/home/me/my repo",
      }),
    ).toBe("vscode://vscode-remote/ssh-remote+ubuntu-ts/home/me/my%20repo?windowId=_blank");
  });

  it("opens a file at its position with the editor's own scheme", () => {
    expect(
      buildRemoteSshOpenUrl({
        editorId: "antigravity",
        host: "me@box",
        workspacePath: "/repo",
        filePath: "/repo/a.ts",
        line: 4,
      }),
    ).toBe("antigravity-ide://vscode-remote/ssh-remote+me%40box/repo/a.ts:4:1");
  });

  it("hex-encodes destinations containing a plus sign", () => {
    const url = buildRemoteSshOpenUrl({ editorId: "cursor", host: "a+b", workspacePath: "/r" });
    const hex = Buffer.from(JSON.stringify({ hostName: "a+b" })).toString("hex");
    expect(url).toBe(`cursor://vscode-remote/ssh-remote+${hex}/r?windowId=_blank`);
  });

  it("uses Zed's ssh URL form", () => {
    expect(buildRemoteSshOpenUrl({ editorId: "zed", host: "me@box", workspacePath: "/repo" })).toBe(
      "zed://ssh/me@box/repo",
    );
  });

  it("rejects editors without a Remote-SSH scheme and relative paths", () => {
    expect(supportsRemoteSsh("xcode")).toBe(false);
    expect(() =>
      buildRemoteSshOpenUrl({ editorId: "xcode", host: "box", workspacePath: "/repo" }),
    ).toThrow();
    expect(() =>
      buildRemoteSshOpenUrl({ editorId: "vscode", host: "box", workspacePath: "repo" }),
    ).toThrow();
  });
});
