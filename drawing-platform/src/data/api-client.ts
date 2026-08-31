import type {
  BoardDocument,
  BoardSummary,
  CreateBoardInput,
  SaveBoardInput,
  TemplateSummary,
} from "../../shared/contracts.js";

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const readJson = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let payload: ErrorPayload = {};
  try {
    payload = (await response.json()) as ErrorPayload;
  } catch {
    // A proxy or network appliance may return a non-JSON error body.
  }

  throw new ApiClientError(
    payload.error?.message ?? `Request failed with status ${response.status}.`,
    response.status,
    payload.error?.code ?? "internal",
  );
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "The API is unavailable.",
      0,
      "network",
    );
  }

  return readJson<T>(response);
};

export const apiClient = {
  async listBoards(): Promise<BoardSummary[]> {
    const result = await request<{ boards: BoardSummary[] }>("/api/boards");
    return result.boards;
  },

  async listTemplates(): Promise<TemplateSummary[]> {
    const result = await request<{ templates: TemplateSummary[] }>(
      "/api/templates",
    );
    return result.templates;
  },

  getBoard(boardId: string): Promise<BoardDocument> {
    return request<BoardDocument>(`/api/boards/${encodeURIComponent(boardId)}`);
  },

  createBoard(input: CreateBoardInput): Promise<BoardDocument> {
    return request<BoardDocument>("/api/boards", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  saveBoard(boardId: string, input: SaveBoardInput): Promise<BoardDocument> {
    return request<BoardDocument>(`/api/boards/${encodeURIComponent(boardId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async deleteBoard(boardId: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`/api/boards/${encodeURIComponent(boardId)}`, {
        method: "DELETE",
      });
    } catch (error) {
      throw new ApiClientError(
        error instanceof Error ? error.message : "The API is unavailable.",
        0,
        "network",
      );
    }

    if (!response.ok) {
      await readJson<never>(response);
    }
  },
};
