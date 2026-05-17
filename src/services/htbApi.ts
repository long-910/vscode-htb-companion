import type {
  HtbMachine,
  HtbProfile,
  HtbActiveMachine,
  HtbFlagSubmitResult,
  HtbPwnbox,
} from '../types/htb.js';
import type { Logger } from '../utils/logger.js';

const HTB_API_BASE = 'https://labs.hackthebox.com/api/v4';

export const ENDPOINTS = {
  userInfo: '/user/info',
  profile: (id: number) => `/user/profile/basic/${id}`,
  machinesActive: '/machine/paginated?per_page=100',
  machinesRetiredPaginated: (page: number) => `/machine/list/retired/paginated?page=${page}`,
  machinesUnreleased: '/machine/unreleased',
  machineProfile: (idOrName: string | number) => `/machine/profile/${idOrName}`,
  startingPoint: (tier: number) => `/sp/tiers/${tier}`,
  machinePlay: (id: number) => `/machine/play/${id}`,
  vmTerminate: '/vm/terminate',
  vmReset: '/vm/reset',
  activeMachine: '/machine/active',
  machineOwn: '/machine/own',
  userActivity: (id: number) => `/profile/activity/${id}`,
  pwnboxStatus: '/pwnbox/status',
  pwnboxAssign: '/pwnbox/assign',
} as const;

export class HtbAuthError extends Error {
  override name = 'HtbAuthError';
}
export class HtbRateLimitError extends Error {
  override name = 'HtbRateLimitError';
}
export class HtbApiError extends Error {
  override name = 'HtbApiError';
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

interface UserInfoResponse {
  info: HtbProfile;
}
interface MachineListResponse {
  data: HtbMachine[];
}
interface MachineProfileResponse {
  info: HtbMachine;
}
interface ActiveMachineResponse {
  info: HtbActiveMachine | null;
}
interface SpawnResponse {
  message: string;
}

export class HtbApiClient {
  constructor(
    private readonly tokenProvider: () => Promise<string | undefined>,
    private readonly logger: Logger,
  ) {}

  private async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const token = await this.tokenProvider();
    if (!token) {
      throw new HtbAuthError('No API token configured. Run HTB: Sign In first.');
    }

    const url = `${HTB_API_BASE}${endpoint}`;
    const headers = new Headers(init.headers as Record<string, string> | undefined);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('User-Agent', 'htb-companion-vscode/0.0.1');

    this.logger.debug(`HTB API ${(init.method ?? 'GET').toUpperCase()} ${endpoint}`);

    const res = await fetch(url, { ...init, headers });

    if (res.status === 401) {
      throw new HtbAuthError('Invalid or expired token. Please sign in again.');
    }
    if (res.status === 429) {
      throw new HtbRateLimitError('Rate limited by HTB API. Please wait and try again.');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HtbApiError(`HTB API error ${res.status}: ${body}`, res.status);
    }

    return res.json() as Promise<T>;
  }

  async verifyToken(): Promise<HtbProfile> {
    const data = await this.request<UserInfoResponse>(ENDPOINTS.userInfo);
    return data.info;
  }

  async listActiveMachines(): Promise<HtbMachine[]> {
    const data = await this.request<MachineListResponse>(ENDPOINTS.machinesActive);
    return data.data ?? [];
  }

  async listRetiredMachines(page = 1): Promise<HtbMachine[]> {
    const data = await this.request<MachineListResponse>(ENDPOINTS.machinesRetiredPaginated(page));
    return data.data ?? [];
  }

  async getMachineProfile(idOrName: string | number): Promise<HtbMachine> {
    const data = await this.request<MachineProfileResponse>(ENDPOINTS.machineProfile(idOrName));
    return data.info;
  }

  async spawnMachine(id: number): Promise<void> {
    await this.request<SpawnResponse>(ENDPOINTS.machinePlay(id), {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  async terminateMachine(): Promise<void> {
    await this.request<unknown>(ENDPOINTS.vmTerminate, { method: 'POST' });
  }

  async resetMachine(id: number): Promise<void> {
    await this.request<unknown>(ENDPOINTS.vmReset, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  async submitFlag(id: number, flag: string, difficulty: number): Promise<HtbFlagSubmitResult> {
    return this.request<HtbFlagSubmitResult>(ENDPOINTS.machineOwn, {
      method: 'POST',
      body: JSON.stringify({ flag, id, difficulty }),
    });
  }

  async getActiveMachine(): Promise<HtbActiveMachine | null> {
    try {
      const data = await this.request<ActiveMachineResponse>(ENDPOINTS.activeMachine);
      return data.info ?? null;
    } catch (e) {
      if (e instanceof HtbApiError && e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  }

  async getStartingPoint(tier: 1 | 2 | 3): Promise<HtbMachine[]> {
    const data = await this.request<MachineListResponse>(ENDPOINTS.startingPoint(tier));
    return data.data ?? [];
  }

  async getPwnboxStatus(): Promise<HtbPwnbox> {
    const data = await this.request<{ data: HtbPwnbox }>(ENDPOINTS.pwnboxStatus);
    return data.data;
  }
}
