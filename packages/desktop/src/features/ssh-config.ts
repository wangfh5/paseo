import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ipcMain } from "electron";

export interface SshConfigHost {
  alias: string;
  hostName?: string;
  user?: string;
}

interface SshConfigFs {
  readFile(filePath: string): string | null;
  listDirectory(directory: string): string[];
}

const nodeFs: SshConfigFs = {
  readFile: (filePath) => (existsSync(filePath) ? readFileSync(filePath, "utf8") : null),
  listDirectory: (directory) => (existsSync(directory) ? readdirSync(directory) : []),
};

const MAX_INCLUDE_DEPTH = 8;

function isConcreteAlias(pattern: string): boolean {
  return !/[*?!]/u.test(pattern);
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/gu, ".*").replace(/\?/gu, ".")}$`, "u");
}

function resolveIncludes(value: string, homeDirectory: string, fs: SshConfigFs): string[] {
  const sshDirectory = path.join(homeDirectory, ".ssh");
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .flatMap((entry) => {
      const expanded = entry.startsWith("~/") ? path.join(homeDirectory, entry.slice(2)) : entry;
      const absolute = path.isAbsolute(expanded) ? expanded : path.join(sshDirectory, expanded);
      const basename = path.basename(absolute);
      if (!/[*?]/u.test(basename)) return [absolute];
      const directory = path.dirname(absolute);
      const matcher = globToRegExp(basename);
      return fs
        .listDirectory(directory)
        .filter((name) => matcher.test(name))
        .sort()
        .map((name) => path.join(directory, name));
    });
}

/** Concrete `Host` aliases from an OpenSSH config, following `Include` directives. */
export function listSshConfigHosts(
  options: { homeDirectory?: string; fs?: SshConfigFs } = {},
): SshConfigHost[] {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const fs = options.fs ?? nodeFs;
  const hosts = new Map<string, SshConfigHost>();
  const visited = new Set<string>();

  function readConfig(filePath: string, depth: number): void {
    if (depth > MAX_INCLUDE_DEPTH || visited.has(filePath)) return;
    visited.add(filePath);
    const text = fs.readFile(filePath);
    if (text === null) return;

    let current: SshConfigHost[] = [];
    for (const rawLine of text.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = /^(\S+?)\s*(?:=\s*|\s+)(.+)$/u.exec(line);
      if (!match) continue;
      const keyword = match[1]!.toLowerCase();
      const value = match[2]!.trim().replace(/^"(.*)"$/u, "$1");

      if (keyword === "include") {
        for (const included of resolveIncludes(value, homeDirectory, fs)) {
          readConfig(included, depth + 1);
        }
      } else if (keyword === "host") {
        current = value
          .split(/\s+/u)
          .filter(isConcreteAlias)
          .map((alias) => {
            const existing = hosts.get(alias) ?? { alias };
            hosts.set(alias, existing);
            return existing;
          });
      } else if (keyword === "match") {
        current = [];
      } else if (keyword === "hostname") {
        for (const host of current) host.hostName ??= value;
      } else if (keyword === "user") {
        for (const host of current) host.user ??= value;
      }
    }
  }

  readConfig(path.join(homeDirectory, ".ssh", "config"), 0);
  return [...hosts.values()];
}

export function registerSshConfigHandlers(): void {
  ipcMain.handle("paseo:ssh:listConfigHosts", () => listSshConfigHosts());
}
