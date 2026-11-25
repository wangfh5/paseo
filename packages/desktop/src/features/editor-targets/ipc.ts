import { ipcMain, shell } from "electron";
import { z } from "zod";

import {
  EDITOR_TARGETS,
  getEditorTarget,
  listAvailableEditorTargets,
  openEditorTarget,
} from "./registry.js";
import { buildRemoteSshOpenUrl, supportsRemoteSsh } from "./remote.js";
import { createEditorTargetRuntime } from "./runtime.js";
import type { EditorTarget, EditorTargetRuntime } from "./target.js";

interface IpcHandlerRegistry {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

const EditorTargetListInputSchema = z.object({
  workspacePath: z.string().trim().min(1).optional(),
  /** List only editors that can open folders on an SSH host. */
  remote: z.boolean().optional(),
});

const EditorTargetLaunchInputSchema = z.object({
  editorId: z.string().trim().min(1),
  workspacePath: z.string().trim().min(1),
  filePath: z.string().trim().min(1).optional(),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
  /** Open the paths on this SSH host (alias or user@host) instead of locally. */
  remoteSshHost: z.string().trim().min(1).optional(),
});

export function registerEditorTargetHandlers(
  options: {
    ipc?: IpcHandlerRegistry;
    runtime?: EditorTargetRuntime;
    targets?: readonly EditorTarget[];
    openUrl?: (url: string) => Promise<void>;
  } = {},
): void {
  const ipc = options.ipc ?? ipcMain;
  const runtime = options.runtime ?? createEditorTargetRuntime();
  const targets = options.targets ?? EDITOR_TARGETS;
  const openUrl = options.openUrl ?? ((url: string) => shell.openExternal(url));

  ipc.handle("paseo:editor:listTargets", (_event, payload: unknown) => {
    const { workspacePath, remote } = EditorTargetListInputSchema.parse(payload ?? {});
    if (remote) {
      const remoteTargets = targets.filter((target) => supportsRemoteSsh(target.id));
      return listAvailableEditorTargets(runtime, remoteTargets);
    }
    return listAvailableEditorTargets(runtime, targets, { workspacePath });
  });
  ipc.handle("paseo:editor:openTarget", async (_event, payload: unknown) => {
    const { remoteSshHost, ...input } = EditorTargetLaunchInputSchema.parse(payload);
    if (!remoteSshHost) {
      await openEditorTarget(input, runtime, targets);
      return;
    }
    const target = getEditorTarget(input.editorId, targets);
    if (!(await target.isInstalled(runtime))) {
      const descriptor = await target.describe(runtime);
      throw new Error(`Editor target unavailable: ${descriptor.label}`);
    }
    await openUrl(buildRemoteSshOpenUrl({ ...input, host: remoteSshHost }));
  });
}
