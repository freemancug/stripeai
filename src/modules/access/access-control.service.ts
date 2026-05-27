type AccessIdentity = {
  workspaceId: string;
  userId: string;
  apiKeyId: string;
  rpmLimit: number;
  concurrencyLimit: number;
};

type TenantApiKeyRecord = AccessIdentity & {
  apiKey: string;
};

type AuthResult =
  | {
      ok: true;
      identity: AccessIdentity;
    }
  | {
      ok: false;
      message: string;
    };

type IsolationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseTenantApiKeys = (
  config: string | undefined,
  defaultRpmLimit: number,
  defaultConcurrencyLimit: number
): TenantApiKeyRecord[] => {
  const source =
    config && config.trim().length > 0
      ? config
      : 'demo-local-key|workspace_demo|user_demo|key_demo';

  return source
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [apiKey, workspaceId, userId, apiKeyId, rpmLimitRaw, concurrencyLimitRaw] = entry
        .split('|')
        .map((item) => item.trim());

      if (!apiKey || !workspaceId || !userId || !apiKeyId) {
        throw new Error(
          `Invalid TENANT_API_KEYS entry: "${entry}". Expected apiKey|workspaceId|userId|apiKeyId|rpmLimit|concurrencyLimit`
        );
      }

      return {
        apiKey,
        workspaceId,
        userId,
        apiKeyId,
        rpmLimit: parsePositiveInt(rpmLimitRaw, defaultRpmLimit),
        concurrencyLimit: parsePositiveInt(concurrencyLimitRaw, defaultConcurrencyLimit)
      };
    });
};

const readBearerToken = (authorizationHeader: string | undefined) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
};

export class AccessControlService {
  private readonly apiKeyMap = new Map<string, AccessIdentity>();
  private readonly requestContext = new Map<string, AccessIdentity>();
  private readonly lockByRequest = new Set<string>();
  private readonly rateCounter = new Map<string, { windowStartMs: number; count: number }>();
  private readonly inflightByWorkspace = new Map<string, number>();

  constructor(params: {
    tenantApiKeysConfig?: string;
    defaultRpmLimit: number;
    defaultConcurrencyLimit: number;
  }) {
    const records = parseTenantApiKeys(
      params.tenantApiKeysConfig,
      params.defaultRpmLimit,
      params.defaultConcurrencyLimit
    );

    for (const record of records) {
      this.apiKeyMap.set(record.apiKey, {
        workspaceId: record.workspaceId,
        userId: record.userId,
        apiKeyId: record.apiKeyId,
        rpmLimit: record.rpmLimit,
        concurrencyLimit: record.concurrencyLimit
      });
    }
  }

  authenticate(requestId: string, authorizationHeader: string | undefined): AuthResult {
    const token = readBearerToken(authorizationHeader);
    if (!token) {
      return {
        ok: false,
        message: 'Missing or invalid Authorization header. Use ****** format.'
      };
    }

    const identity = this.apiKeyMap.get(token);
    if (!identity) {
      return {
        ok: false,
        message: 'Invalid API key.'
      };
    }

    this.requestContext.set(requestId, identity);
    return {
      ok: true,
      identity
    };
  }

  getIdentity(requestId: string) {
    return this.requestContext.get(requestId);
  }

  acquireIsolation(requestId: string): IsolationResult {
    const identity = this.requestContext.get(requestId);
    if (!identity) {
      return {
        ok: false,
        message: 'Missing tenant identity in request context.'
      };
    }

    const now = Date.now();
    const windowStartMs = Math.floor(now / 60_000) * 60_000;
    const existingWindow = this.rateCounter.get(identity.workspaceId);
    const currentWindow =
      existingWindow && existingWindow.windowStartMs === windowStartMs
        ? existingWindow
        : { windowStartMs, count: 0 };

    if (currentWindow.count >= identity.rpmLimit) {
      return {
        ok: false,
        message: `Tenant rate limit exceeded (${identity.rpmLimit} rpm).`
      };
    }

    const inflight = this.inflightByWorkspace.get(identity.workspaceId) ?? 0;
    if (inflight >= identity.concurrencyLimit) {
      return {
        ok: false,
        message: `Tenant concurrent limit exceeded (${identity.concurrencyLimit}).`
      };
    }

    currentWindow.count += 1;
    this.rateCounter.set(identity.workspaceId, currentWindow);
    this.inflightByWorkspace.set(identity.workspaceId, inflight + 1);
    this.lockByRequest.add(requestId);

    return {
      ok: true
    };
  }

  release(requestId: string) {
    const identity = this.requestContext.get(requestId);
    if (identity && this.lockByRequest.has(requestId)) {
      const inflight = this.inflightByWorkspace.get(identity.workspaceId) ?? 0;
      if (inflight <= 1) {
        this.inflightByWorkspace.delete(identity.workspaceId);
      } else {
        this.inflightByWorkspace.set(identity.workspaceId, inflight - 1);
      }
      this.lockByRequest.delete(requestId);
    }

    this.requestContext.delete(requestId);
  }
}

export type { AccessIdentity };
