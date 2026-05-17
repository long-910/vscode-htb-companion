export interface HtbMachine {
  id: number;
  name: string;
  os: 'Linux' | 'Windows' | 'FreeBSD' | 'OpenBSD' | 'Other';
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  difficultyText: string;
  points: number;
  ip?: string;
  active: boolean;
  retired: boolean;
  authUserInUserOwns: boolean;
  authUserInRootOwns: boolean;
  release: string;
  avatar: string;
  star: number;
  playInfo?: {
    isSpawned: boolean;
    isSpawning: boolean;
    isActive: boolean;
    expiresAt: string | null;
  };
}

export interface HtbProfile {
  id: number;
  name: string;
  team?: { id: number; name: string };
  rank: string;
  points: number;
  ownership: number;
  subscription: 'free' | 'vip' | 'vip+';
}

export interface HtbActiveMachine {
  id: number;
  name: string;
  ip: string;
  type: 'release' | 'retired';
  lab_server: string;
  expires_at: string;
}

export interface HtbFlagSubmitResult {
  message: string;
  success: boolean;
  ownType?: 'user' | 'root';
}

export interface HtbPwnbox {
  hostname: string;
  username: string;
  password?: string;
  status: 'running' | 'stopped' | 'unknown';
  location?: string;
}

export interface HtbSherlock {
  id: number;
  name: string;
  difficulty: 'Very Easy' | 'Easy' | 'Medium' | 'Hard';
  category: string;
  isSolved: boolean;
  points: number;
  description?: string;
  scenario?: string;
  filesUrl?: string;
  releaseAt?: string;
}
