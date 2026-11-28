import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDesktopHost, type DesktopEditorBridge } from "@/desktop/host";
import { useHosts } from "@/runtime/host-runtime";

export type DesktopOpenTargetKind = "editor" | "file-manager";
export type DesktopOpenTargetIcon =
  | { kind: "image"; dataUrl: string }
  | { kind: "symbol"; name: "folder" | "terminal" };

export interface DesktopOpenTarget {
  id: string;
  label: string;
  kind: DesktopOpenTargetKind;
  icon: DesktopOpenTargetIcon;
}

export interface OpenDesktopTargetInput {
  editorId: string;
  workspacePath: string;
  filePath?: string;
  line?: number;
  column?: number;
  remoteSshHost?: string;
}

interface AvailableDesktopEditorBridge {
  listTargets: NonNullable<DesktopEditorBridge["listTargets"]>;
  openTarget: NonNullable<DesktopEditorBridge["openTarget"]>;
}

interface SelectDesktopOpenTargetsInput {
  canListTargets: boolean;
  targets: DesktopOpenTarget[] | undefined;
}

export function selectDesktopOpenTargets({
  canListTargets,
  targets,
}: SelectDesktopOpenTargetsInput): DesktopOpenTarget[] {
  if (!canListTargets) {
    return [];
  }
  return targets ?? [];
}

function getDesktopEditorBridge(): AvailableDesktopEditorBridge | null {
  const bridge = getDesktopHost()?.editor;
  if (!bridge?.listTargets || !bridge.openTarget) {
    return null;
  }
  return {
    listTargets: bridge.listTargets,
    openTarget: bridge.openTarget,
  };
}

export function hasDesktopOpenTargetsBridge(): boolean {
  return getDesktopEditorBridge() !== null;
}

export async function listDesktopOpenTargets(
  input: { workspacePath?: string; remote?: boolean } = {},
): Promise<DesktopOpenTarget[]> {
  const bridge = getDesktopEditorBridge();
  if (!bridge) {
    return [];
  }
  return await bridge.listTargets(input);
}

export async function openDesktopTarget(input: OpenDesktopTargetInput): Promise<void> {
  const bridge = getDesktopEditorBridge();
  if (!bridge) {
    throw new Error("Desktop editor bridge is unavailable");
  }
  await bridge.openTarget(input);
}

/**
 * SSH destination of a remote host's Remote SSH connection, so its folders can open in
 * editors with Remote-SSH support. Null for the local daemon and non-SSH hosts.
 */
export function useRemoteSshHost(serverId: string, isLocalExecution: boolean): string | null {
  const hosts = useHosts();
  return useMemo(() => {
    if (isLocalExecution) return null;
    const profile = hosts.find((host) => host.serverId === serverId);
    for (const connection of profile?.connections ?? []) {
      if (connection.type === "remoteSsh") return connection.host;
    }
    return null;
  }, [hosts, isLocalExecution, serverId]);
}

/**
 * Pass `workspacePath` whenever it is known. Project-specific targets such as
 * Xcode are only listed for workspaces they can actually open, so callers that
 * omit it get the workspace-agnostic targets only.
 */
export function useDesktopOpenTargets(input: {
  isLocalExecution: boolean;
  /** Lists Remote-SSH capable editors when the workspace lives on this SSH host. */
  remoteSshHost?: string | null;
  workspacePath?: string;
}) {
  const hasBridge = hasDesktopOpenTargetsBridge();
  const remote = !input.isLocalExecution && Boolean(input.remoteSshHost);
  const canListTargets = hasBridge && (input.isLocalExecution || remote);
  const workspacePath = remote ? "" : (input.workspacePath?.trim() ?? "");
  const query = useQuery({
    queryKey: ["desktop-open-targets", workspacePath, remote],
    enabled: canListTargets,
    staleTime: 60_000,
    retry: false,
    queryFn: () =>
      listDesktopOpenTargets({
        ...(remote ? { remote } : {}),
        ...(workspacePath ? { workspacePath } : {}),
      }),
  });
  const targets = selectDesktopOpenTargets({
    canListTargets,
    targets: query.data,
  });

  return {
    targets,
    isAvailable: canListTargets,
  };
}
