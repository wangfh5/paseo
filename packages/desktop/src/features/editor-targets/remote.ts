// Editors that open folders on an SSH host through their own Remote-SSH URL scheme.
const REMOTE_SSH_SCHEMES: Readonly<Record<string, string>> = {
  vscode: "vscode",
  "vscode-insiders": "vscode-insiders",
  vscodium: "vscodium",
  cursor: "cursor",
  antigravity: "antigravity-ide",
  zed: "zed",
};

export function supportsRemoteSsh(editorId: string): boolean {
  return editorId in REMOTE_SSH_SCHEMES;
}

export interface RemoteSshOpenInput {
  editorId: string;
  /** SSH destination as typed for `ssh`: an alias from ~/.ssh/config or `user@host`. */
  host: string;
  workspacePath: string;
  filePath?: string;
  line?: number;
  column?: number;
}

function encodePath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

export function buildRemoteSshOpenUrl(input: RemoteSshOpenInput): string {
  const scheme = REMOTE_SSH_SCHEMES[input.editorId];
  if (!scheme) throw new Error(`Editor target cannot open SSH hosts: ${input.editorId}`);
  const target = input.filePath ?? input.workspacePath;
  if (!target.startsWith("/")) {
    throw new Error("Remote editor path must be an absolute POSIX path");
  }

  if (scheme === "zed") {
    // Zed reads this segment as ssh URL userinfo, so the `@` stays literal.
    const separator = input.host.lastIndexOf("@");
    const destination =
      separator === -1
        ? encodeURIComponent(input.host)
        : `${encodeURIComponent(input.host.slice(0, separator))}@${encodeURIComponent(input.host.slice(separator + 1))}`;
    return `zed://ssh/${destination}${encodePath(target)}`;
  }

  // Remote-SSH splits the decoded authority on "+", so such a destination needs its
  // hex-encoded JSON form instead.
  const separator = input.host.lastIndexOf("@");
  const destination = input.host.includes("+")
    ? Array.from(
        new TextEncoder().encode(
          JSON.stringify(
            separator === -1
              ? { hostName: input.host }
              : { hostName: input.host.slice(separator + 1), user: input.host.slice(0, separator) },
          ),
        ),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("")
    : input.host;
  const base = `${scheme}://vscode-remote/ssh-remote+${encodeURIComponent(destination)}${encodePath(target)}`;
  if (!input.filePath) {
    // Without windowId=_blank a folder link replaces the last active window.
    return `${base}?windowId=_blank`;
  }
  // A trailing position makes VS Code open the path as a file.
  return `${base}:${input.line ?? 1}:${input.column ?? 1}`;
}
