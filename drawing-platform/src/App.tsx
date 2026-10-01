import {
  Braces,
  FileImage,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  BoardDocument,
  BoardScene,
  BoardSummary,
  CanvasElement,
  TemplateSummary,
} from "../shared/contracts.js";
import { BOARD_SCHEMA_VERSION, createEmptyScene } from "../shared/contracts.js";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoadingState,
  BoardNavigator,
  ConfirmDialog,
  StencilShelf,
  ToastViewport,
  WorkspaceLayout,
  type BoardNavigationItem,
  type PersistenceStatus,
  type ToastMessage,
} from "./components/index.js";
import { apiClient } from "./data/api-client.js";
import {
  createCustomStencilStore,
  instantiateCustomStencil,
} from "./data/custom-stencil-store.js";
import {
  chooseNewestDocument,
  createLocalBoardStore,
} from "./data/local-board-store.js";
import {
  RevisionSaveQueue,
  type SaveStatus,
} from "./data/revision-save-queue.js";
import {
  EditorCanvas,
  type CanvasEditorApi,
} from "./editor/EditorCanvas.js";
import { CanvasErrorBoundary } from "./editor/CanvasErrorBoundary.js";
import {
  exportBoardJson,
  exportBoardPng,
  exportBoardSvg,
} from "./editor/downloads.js";
import { parseBoardImport } from "./editor/scene.js";
import { findDesignTemplate } from "./editor/reset-design.js";
import {
  STENCIL_CATALOG,
  createStencilElements,
} from "./stencils/index.js";

type LoadState = "loading" | "ready" | "error";
type ExportKind = "json" | "svg" | "png";

const toSummary = (document: BoardDocument): BoardSummary => ({
  id: document.id,
  name: document.name,
  revision: document.revision,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  elementCount: document.scene.elements.length,
});

const formatUpdatedAt = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Saved locally";
  }
  return `Updated ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
};

const mapSaveStatus = (status: SaveStatus): PersistenceStatus =>
  status === "saved-local" ? "saved-locally" : status;

const newestTimestamp = (left: string, right: string): string =>
  Date.parse(left) >= Date.parse(right) ? left : right;

export function App() {
  const localBoards = useMemo(
    () => createLocalBoardStore(window.localStorage),
    [],
  );
  const customStencilStore = useMemo(
    () => createCustomStencilStore(window.localStorage),
    [],
  );
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [editorSession, setEditorSession] = useState(0);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>();
  const [loadingTemplateId, setLoadingTemplateId] = useState<string>();
  const [customStencils, setCustomStencils] = useState(() =>
    customStencilStore.list(),
  );
  const [activeBoard, setActiveBoard] = useState<BoardDocument | null>(null);
  const [draftName, setDraftName] = useState("");
  const [syncStatus, setSyncStatus] =
    useState<PersistenceStatus>("synced");
  const [syncMessage, setSyncMessage] = useState<string>();
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [boardActionError, setBoardActionError] = useState<string>();
  const [deleteTarget, setDeleteTarget] =
    useState<BoardNavigationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [boardDrawerOpen, setBoardDrawerOpen] = useState(false);
  const [stencilDrawerOpen, setStencilDrawerOpen] = useState(false);
  const [stencilCollapsed, setStencilCollapsed] = useState(false);
  const [stencilQuery, setStencilQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportKind>();
  const [conflictReloadOpen, setConflictReloadOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorApiRef = useRef<CanvasEditorApi | null>(null);
  const activeBoardRef = useRef<BoardDocument | null>(null);
  const resetBaselineRef = useRef<BoardDocument | null>(null);
  const saveQueueRef = useRef<RevisionSaveQueue | null>(null);
  const previewTemplateIdRef = useRef<string | null>(null);
  const localWriteFailedRef = useRef(false);

  const handleEditorApiReady = useCallback(
    (api: CanvasEditorApi) => {
      editorApiRef.current = api;
    },
    [],
  );

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter(({ id }) => id !== toastId));
  }, []);

  const notify = useCallback(
    (message: Omit<ToastMessage, "id">) => {
      const id = window.crypto.randomUUID();
      setToasts((current) => [...current.slice(-2), { ...message, id }]);
      window.setTimeout(() => dismissToast(id), 4_500);
    },
    [dismissToast],
  );

  const writeLocalBoard = useCallback(
    (document: BoardDocument): boolean => {
      try {
        localBoards.write(document);
        localWriteFailedRef.current = false;
        return true;
      } catch {
        setSyncStatus("offline");
        setSyncMessage(
          "Browser storage is full. Remove large images or export the board before continuing.",
        );
        if (!localWriteFailedRef.current) {
          localWriteFailedRef.current = true;
          notify({
            title: "Local save failed",
            description:
              "Browser storage is full. The current canvas is still open; export it before reloading.",
            tone: "error",
          });
        }
        return false;
      }
    },
    [localBoards, notify],
  );

  const updateBoardSummary = useCallback((document: BoardDocument) => {
    const summary = toSummary(document);
    setBoards((current) => {
      const withoutCurrent = current.filter(({ id }) => id !== summary.id);
      return [summary, ...withoutCurrent].sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
      );
    });
  }, []);

  const activateBoard = useCallback(
    (document: BoardDocument, status: PersistenceStatus) => {
      saveQueueRef.current?.dispose();
      previewTemplateIdRef.current = null;
      setPreviewTemplateId(undefined);
      activeBoardRef.current = document;
      resetBaselineRef.current = structuredClone(document);
      setActiveBoard(document);
      setEditorSession((value) => value + 1);
      setDraftName(document.name);
      setSyncStatus(status);
      setSyncMessage(undefined);
      setBoardActionError(undefined);
      writeLocalBoard(document);
      localBoards.setActive(document.id);
      updateBoardSummary(document);
      window.history.replaceState(null, "", `?board=${document.id}`);

      const boardId = document.id;
      saveQueueRef.current = new RevisionSaveQueue({
        initialRevision: document.revision,
        manualOnly: true,
        save: (payload, expectedRevision) =>
          apiClient.saveBoard(boardId, {
            ...payload,
            expectedRevision,
          }),
        onStatus: (nextStatus, message) => {
          if (activeBoardRef.current?.id !== boardId) {
            return;
          }
          setSyncStatus(mapSaveStatus(nextStatus));
          setSyncMessage(message);
        },
        onSaved: (saved) => {
          const current = activeBoardRef.current;
          if (!current || current.id !== boardId) {
            return;
          }
          const next: BoardDocument = {
            ...current,
            revision: saved.revision,
            createdAt: saved.createdAt,
            updatedAt: newestTimestamp(current.updatedAt, saved.updatedAt),
          };
          activeBoardRef.current = next;
          writeLocalBoard(next);
          setActiveBoard((visible) =>
            visible?.id === boardId
              ? {
                  ...visible,
                  revision: next.revision,
                  updatedAt: next.updatedAt,
                }
              : visible,
          );
          updateBoardSummary(next);
        },
      });
    },
    [localBoards, updateBoardSummary, writeLocalBoard],
  );

  const openBoard = useCallback(
    async (boardId: string) => {
      setBoardActionError(undefined);
      const local = localBoards.read(boardId);
      try {
        const remote = await apiClient.getBoard(boardId);
        const chosen = chooseNewestDocument(remote, local);
        activateBoard(
          chosen,
          chosen === local ? "saved-locally" : "synced",
        );
      } catch (error) {
        if (local) {
          activateBoard(local, "offline");
          setSyncMessage(
            error instanceof Error ? error.message : "The API is unavailable.",
          );
          return;
        }
        setBoardActionError(
          error instanceof Error ? error.message : "The board could not open.",
        );
      } finally {
        setBoardDrawerOpen(false);
      }
    },
    [activateBoard, localBoards],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadState("loading");
      setLoadError("");

      const [boardResult, templateResult] = await Promise.allSettled([
        apiClient.listBoards(),
        apiClient.listTemplates(),
      ]);
      if (cancelled) return;

      if (templateResult.status === "fulfilled") {
        setTemplates(templateResult.value);
      }

      if (boardResult.status === "fulfilled") {
        setBoards(boardResult.value);
        if (boardResult.value.length === 0) {
          setLoadState("ready");
          return;
        }

        const requestedId = new URLSearchParams(window.location.search).get(
          "board",
        );
        const rememberedId = localBoards.getActive();
        const boardId =
          boardResult.value.find(({ id }) => id === requestedId)?.id ??
          boardResult.value.find(({ id }) => id === rememberedId)?.id ??
          boardResult.value[0].id;
        await openBoard(boardId);
        if (!cancelled) setLoadState("ready");
        return;
      }

      const localId = localBoards.getActive();
      const local = localId ? localBoards.read(localId) : null;
      if (local) {
        setBoards([toSummary(local)]);
        activateBoard(local, "offline");
        setSyncMessage("The API is unavailable. Editing continues locally.");
        setLoadState("ready");
        return;
      }

      setLoadError(
        boardResult.reason instanceof Error
          ? boardResult.reason.message
          : "No server or local board could be reached.",
      );
      setLoadState("error");
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [activateBoard, localBoards, openBoard, reloadToken]);

  useEffect(
    () => () => {
      saveQueueRef.current?.dispose();
    },
    [],
  );

  const persistLocalChange = useCallback(
    (scene: BoardScene, name?: string) => {
      const current = activeBoardRef.current;
      if (!current) return;

      const next: BoardDocument = {
        ...current,
        name: name ?? current.name,
        updatedAt: new Date().toISOString(),
        scene,
      };
      activeBoardRef.current = next;
      if (previewTemplateIdRef.current) {
        return;
      }
      if (!writeLocalBoard(next)) return;
      updateBoardSummary(next);
      saveQueueRef.current?.enqueue({ name: next.name, scene });
    },
    [updateBoardSummary, writeLocalBoard],
  );

  const commitBoardName = useCallback(() => {
    const current = activeBoardRef.current;
    if (!current) return;
    const name = draftName.trim();
    if (!name || name.length > 80) {
      setDraftName(current.name);
      notify({
        title: "Board name not changed",
        description: "Use between 1 and 80 characters.",
        tone: "warning",
      });
      return;
    }
    if (name === current.name) return;

    const next = { ...current, name, updatedAt: new Date().toISOString() };
    activeBoardRef.current = next;
    setActiveBoard((visible) =>
      visible?.id === next.id ? { ...visible, name } : visible,
    );
    if (previewTemplateIdRef.current) return;
    if (!writeLocalBoard(next)) return;
    updateBoardSummary(next);
    saveQueueRef.current?.enqueue({ name, scene: next.scene });
  }, [draftName, notify, updateBoardSummary, writeLocalBoard]);

  const createBoard = useCallback(
    async (templateId?: string) => {
      setIsCreating(true);
      setBoardActionError(undefined);
      try {
        const template = templates.find(({ id }) => id === templateId);
        const document = await apiClient.createBoard({
          name: template?.name ?? "Untitled system",
          ...(templateId ? { templateId } : {}),
        });
        activateBoard(document, "synced");
        setBoardDrawerOpen(false);
        notify({
          title: template ? "Template copied" : "Board created",
          description: template
            ? `${template.name} is now an independent editable board.`
            : "Start with a component or any drawing tool.",
          tone: "success",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The board could not be created.";
        setBoardActionError(message);
        notify({ title: "Could not create board", description: message, tone: "error" });
      } finally {
        setIsCreating(false);
      }
    },
    [activateBoard, notify, templates],
  );

  const previewTemplate = useCallback(
    async (templateId: string) => {
      setLoadingTemplateId(templateId);
      setBoardActionError(undefined);
      try {
        const template = await apiClient.getTemplate(templateId);
        const timestamp = new Date().toISOString();
        const preview: BoardDocument = {
          schemaVersion: BOARD_SCHEMA_VERSION,
          id: `preview-${template.id}`,
          name: template.name,
          revision: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          scene: structuredClone(template.scene),
        };

        saveQueueRef.current?.dispose();
        saveQueueRef.current = null;
        previewTemplateIdRef.current = template.id;
        setPreviewTemplateId(template.id);
        activeBoardRef.current = preview;
        setActiveBoard(preview);
        setEditorSession((value) => value + 1);
        setDraftName(template.name);
        setSyncStatus("preview");
        setSyncMessage(undefined);
        setBoardDrawerOpen(false);
        window.history.replaceState(null, "", window.location.pathname);
        notify({
          title: "Template preview",
          description: "Loaded temporarily. Use + to create a saved board.",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The template could not be previewed.";
        setBoardActionError(message);
        notify({ title: "Could not preview template", description: message, tone: "error" });
      } finally {
        setLoadingTemplateId(undefined);
      }
    },
    [notify],
  );

  const deleteBoard = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteBoard(deleteTarget.id);
      localBoards.remove(deleteTarget.id);
      const remaining = boards.filter(({ id }) => id !== deleteTarget.id);
      setBoards(remaining);
      const deletedActive = activeBoardRef.current?.id === deleteTarget.id;
      setDeleteTarget(null);
      if (deletedActive && remaining[0]) {
        await openBoard(remaining[0].id);
      }
      notify({ title: "Board deleted", tone: "success" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The board could not be deleted.";
      setBoardActionError(message);
      notify({ title: "Could not delete board", description: message, tone: "error" });
    } finally {
      setIsDeleting(false);
    }
  }, [boards, deleteTarget, localBoards, notify, openBoard]);

  const insertStencil = useCallback(
    (stencilId: string) => {
      const api = editorApiRef.current;
      if (!api) return;
      const custom = customStencils.find(({ id }) => id === stencilId);
      api.insertElements(
        custom
          ? [instantiateCustomStencil(custom, api.getViewportCenter())]
          : createStencilElements(stencilId, api.getViewportCenter()),
      );
      setStencilDrawerOpen(false);
    },
    [customStencils],
  );

  const saveSelectionToLibrary = useCallback(
    (element: CanvasElement) => {
      try {
        const saved = customStencilStore.save(element);
        setCustomStencils(customStencilStore.list());
        setStencilCollapsed(false);
        notify({
          title: "Component saved",
          description: `${saved.name} is now reusable from My library.`,
          tone: "success",
        });
      } catch (error) {
        notify({
          title: "Component not saved",
          description:
            error instanceof Error ? error.message : "Browser storage is unavailable.",
          tone: "error",
        });
      }
    },
    [customStencilStore, notify],
  );

  const removeCustomStencil = useCallback(
    (stencilId: string) => {
      customStencilStore.remove(stencilId);
      setCustomStencils(customStencilStore.list());
      notify({ title: "Component removed from library", tone: "success" });
    },
    [customStencilStore, notify],
  );

  const importBoard = useCallback(
    async (file: File) => {
      const api = editorApiRef.current;
      const current = activeBoardRef.current;
      if (!api || !current) return;

      try {
        const imported = parseBoardImport(JSON.parse(await file.text()));
        const isPreview = Boolean(previewTemplateIdRef.current);
        api.replaceScene(imported.scene);
        if (imported.name) setDraftName(imported.name.slice(0, 80));
        persistLocalChange(
          imported.scene,
          imported.name?.slice(0, 80) || current.name,
        );
        notify({
          title: "Board imported",
          description: isPreview
            ? "The imported scene is loaded only in this temporary preview."
            : "The imported scene is saved locally. Use Save to update the server copy.",
          tone: "success",
        });
      } catch (error) {
        notify({
          title: "Import rejected",
          description:
            error instanceof Error ? error.message : "The file is not a supported board.",
          tone: "error",
        });
      }
    },
    [notify, persistLocalChange],
  );

  const clearBoard = useCallback(() => {
    const api = editorApiRef.current;
    if (!api) return;
    const empty = createEmptyScene();
    empty.appState.background = api.getScene().appState.background;
    api.replaceScene(empty);
    persistLocalChange(api.getScene());
    notify({ title: "Board cleared", description: "Saved server designs are unchanged. Undo restores the canvas." });
  }, [notify, persistLocalChange]);

  const saveBoardManually = useCallback(async () => {
    const current = activeBoardRef.current;
    if (!current || syncStatus === "saving") return;
    if (previewTemplateIdRef.current) {
      setSyncStatus("saving");
      try {
        const created = await apiClient.createBoard({ name: current.name });
        const saved = await apiClient.saveBoard(created.id, {
          name: current.name, scene: structuredClone(current.scene), expectedRevision: created.revision,
        });
        const latest = activeBoardRef.current;
        if (latest?.id === current.id) {
          const changed = latest !== current;
          activateBoard(changed ? { ...saved, name: latest.name, scene: latest.scene, updatedAt: latest.updatedAt } : saved,
            changed ? "saved-locally" : "synced");
        } else updateBoardSummary(saved);
      } catch (error) {
        if (activeBoardRef.current?.id === current.id) setSyncStatus("preview");
        notify({ title: "Save failed", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
      }
      return;
    }
    saveQueueRef.current?.enqueue({ name: current.name, scene: structuredClone(current.scene) });
    await saveQueueRef.current?.flush();
  }, [activateBoard, notify, syncStatus, updateBoardSummary]);

  const resetDesign = useCallback(async () => {
    const api = editorApiRef.current;
    const current = activeBoardRef.current;
    if (!api || !current || isResetting) return;
    setIsResetting(true);
    try {
      const definitions = await Promise.all(templates.map(template => apiClient.getTemplate(template.id)));
      // A late response must never reset a different board or editor session.
      if (activeBoardRef.current?.id !== current.id || editorApiRef.current !== api) return;
      const template = findDesignTemplate({ ...current, scene: api.getScene() }, definitions, previewTemplateIdRef.current)
        ?? (resetBaselineRef.current?.id === current.id
          ? findDesignTemplate(resetBaselineRef.current, definitions) : undefined);
      if (!template) {
        notify({ title: "No matching template", description: "This board has no recognizable built-in design to restore. Choose a template from Boards.", tone: "info" });
        return;
      }
      api.replaceScene(structuredClone(template.scene));
      persistLocalChange(api.getScene());
      notify({ title: "Design reset", description: `${template.name} restored. Undo brings back your edits.`, tone: "success" });
    } catch (error) {
      notify({ title: "Could not reset design", description: error instanceof Error ? error.message : "Try again when templates are available.", tone: "error" });
    } finally {
      setIsResetting(false);
    }
  }, [isResetting, notify, persistLocalChange, templates]);

  const exportBoard = useCallback(
    async (kind: ExportKind) => {
      const api = editorApiRef.current;
      const board = activeBoardRef.current;
      if (!api || !board) return;
      setExporting(kind);
      try {
        if (kind === "json") exportBoardJson(board, api);
        if (kind === "svg") await exportBoardSvg(board, api);
        if (kind === "png") await exportBoardPng(board, api);
        setExportOpen(false);
        notify({ title: `${kind.toUpperCase()} exported`, tone: "success" });
      } catch (error) {
        notify({
          title: "Export failed",
          description: error instanceof Error ? error.message : "Please try again.",
          tone: "error",
        });
      } finally {
        setExporting(undefined);
      }
    },
    [notify],
  );

  const reloadServerCopy = useCallback(async () => {
    const current = activeBoardRef.current;
    if (!current) return;
    try {
      const remote = await apiClient.getBoard(current.id);
      activateBoard(remote, "synced");
      setConflictReloadOpen(false);
      notify({
        title: "Server copy loaded",
        description: "The conflicting local scene was replaced explicitly.",
        tone: "success",
      });
    } catch (error) {
      notify({
        title: "Could not reload server copy",
        description: error instanceof Error ? error.message : "Please try again.",
        tone: "error",
      });
    }
  }, [activateBoard, notify]);

  const navigationBoards: BoardNavigationItem[] = boards.map((board) => ({
    id: board.id,
    name: board.name,
    updatedAtLabel: formatUpdatedAt(board.updatedAt),
    elementCount: board.elementCount,
    canDelete: boards.length > 1,
  }));

  const availableStencils = [
    ...customStencils.map((stencil) => ({
      id: stencil.id,
      name: stencil.name,
      role: stencil.role,
      category: "My library",
      accent: stencil.accent,
      iconId: stencil.iconId,
      keywords: ["custom", "saved", "library"],
      removable: true,
    })),
    ...STENCIL_CATALOG,
  ];

  if (loadState === "loading") {
    return <AppLoadingState />;
  }
  if (loadState === "error") {
    return (
      <AppErrorState
        message={loadError}
        onRetry={() => setReloadToken((value) => value + 1)}
      />
    );
  }

  const header = (
    <AppHeader
      boardName={activeBoard ? draftName : "No board open"}
      syncStatus={syncStatus}
      onBoardNameChange={setDraftName}
      onBoardNameCommit={commitBoardName}
      onNewBoard={() => void createBoard()}
      onImport={() => fileInputRef.current?.click()}
      onExport={() => setExportOpen(true)}
      onResetDesign={() => void resetDesign()}
      onClearBoard={clearBoard}
      onSaveBoard={() => void saveBoardManually()}
      isResetting={isResetting}
      onOpenBoards={() => setBoardDrawerOpen(true)}
      onOpenStencils={() => setStencilDrawerOpen(true)}
      isCreating={isCreating}
      actionsDisabled={!activeBoard}
    />
  );

  const navigator = (
    <BoardNavigator
      boards={navigationBoards}
      activeBoardId={activeBoard?.id}
      templates={templates}
      activeTemplateId={previewTemplateId}
      loadingTemplateId={loadingTemplateId}
      onSelectBoard={(boardId) => void openBoard(boardId)}
      onCreateBoard={() => void createBoard()}
      onPreviewTemplate={(templateId) => void previewTemplate(templateId)}
      onCreateFromTemplate={(templateId) => void createBoard(templateId)}
      onRequestDelete={setDeleteTarget}
      onClose={() => setBoardDrawerOpen(false)}
      isOpen={boardDrawerOpen}
      isCreating={isCreating}
      actionError={boardActionError}
    />
  );

  const stencilShelf = (
    <StencilShelf
      stencils={availableStencils}
      searchQuery={stencilQuery}
      onSearchQueryChange={setStencilQuery}
      onInsertStencil={insertStencil}
      onRemoveStencil={removeCustomStencil}
      onToggleCollapsed={() => setStencilCollapsed((value) => !value)}
      collapsed={stencilCollapsed}
      isOpen={stencilDrawerOpen}
      onClose={() => setStencilDrawerOpen(false)}
    />
  );

  return (
    <>
      <WorkspaceLayout
        header={header}
        boardNavigator={navigator}
        stencilShelf={stencilShelf}
      >
        {activeBoard ? (
          <CanvasErrorBoundary resetKey={`${activeBoard.id}:${editorSession}`}>
            <EditorCanvas
              key={`${activeBoard.id}:${editorSession}`}
              board={activeBoard}
              onApiReady={handleEditorApiReady}
              onSceneChange={persistLocalChange}
              onSaveSelectionToLibrary={saveSelectionToLibrary}
            />
          </CanvasErrorBoundary>
        ) : (
          <AppEmptyState
            onCreateBoard={() => void createBoard()}
            onBrowseTemplates={() => {
              setBoardDrawerOpen(true);
              notify({
                title: "Choose a starting point",
                description: "Templates create independent editable boards.",
              });
            }}
            isCreating={isCreating}
          />
        )}
      </WorkspaceLayout>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".json,.excalidraw,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importBoard(file);
          event.currentTarget.value = "";
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? "this board"}?`}
        description="This removes the server snapshot and cannot be undone. Export a JSON copy first if you may need it."
        confirmLabel="Delete board"
        tone="danger"
        busy={isDeleting}
        onConfirm={() => void deleteBoard()}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={conflictReloadOpen}
        title="Reload the server copy?"
        description="This explicitly replaces the local conflicting canvas. Export your local JSON first if you need to preserve it."
        confirmLabel="Reload server copy"
        tone="danger"
        onConfirm={() => void reloadServerCopy()}
        onCancel={() => setConflictReloadOpen(false)}
      />

      {exportOpen ? (
        <div className="dialog-layer" role="presentation">
          <button
            className="dialog-layer__backdrop"
            type="button"
            onClick={() => setExportOpen(false)}
            aria-label="Close export options"
          />
          <section
            className="export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
          >
            <button
              className="icon-button export-dialog__close"
              type="button"
              onClick={() => setExportOpen(false)}
              aria-label="Close export options"
            >
              <X aria-hidden="true" />
            </button>
            <p className="eyebrow">Take the work with you</p>
            <h2 id="export-dialog-title">Export this board</h2>
            <p>JSON stays editable. SVG and PNG are ready for documentation.</p>
            <div className="export-grid">
              <button type="button" onClick={() => void exportBoard("json")}>
                <Braces aria-hidden="true" />
                <strong>Board JSON</strong>
                <span>Versioned, editable source</span>
              </button>
              <button type="button" onClick={() => void exportBoard("svg")}>
                <FileImage aria-hidden="true" />
                <strong>SVG</strong>
                <span>Crisp docs and websites</span>
              </button>
              <button type="button" onClick={() => void exportBoard("png")}>
                <ImageIcon aria-hidden="true" />
                <strong>PNG</strong>
                <span>Portable raster image</span>
              </button>
            </div>
            {exporting ? <p className="export-dialog__progress">Preparing {exporting.toUpperCase()}…</p> : null}
          </section>
        </div>
      ) : null}

      {syncMessage && syncStatus === "conflict" ? (
        <section
          className="conflict-banner"
          role="alert"
        >
          <span className="conflict-banner__mark" aria-hidden="true" />
          <div className="conflict-banner__copy">
            <strong>Remote revision changed.</strong>
            <span>{syncMessage} Your local canvas is still intact.</span>
          </div>
          <div className="conflict-banner__actions">
            <button type="button" onClick={() => void exportBoard("json")}>
              Export local JSON
            </button>
            <button type="button" onClick={() => setConflictReloadOpen(true)}>
              Reload server
            </button>
          </div>
        </section>
      ) : null}

      <ToastViewport messages={toasts} onDismiss={dismissToast} />
    </>
  );
}
