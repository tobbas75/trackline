/**
 * In-memory job tracker for long-running Sentinel imagery processing.
 *
 * Used by dMIBR async polling: the imagery route kicks off processing
 * in a detached promise and returns a jobId immediately. The client
 * polls /api/sentinel/imagery/status for progress updates.
 *
 * Attached to `globalThis` so it survives HMR in dev mode.
 */

export interface SentinelJob {
  jobId: string;
  cacheKey: string;
  status: "processing" | "complete" | "error";
  progress: string;
  step: number;
  totalSteps: number;
  error?: string;
  createdAt: number;
}

type JobStore = Map<string, SentinelJob>;

const STORE_KEY = "__sentinelJobs" as const;
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/** Access the global job store (survives HMR) */
function getStore(): JobStore {
  const g = globalThis as unknown as Record<string, JobStore | undefined>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY];
}

/** Purge jobs older than 15 minutes */
function purgeStale(): void {
  const store = getStore();
  const now = Date.now();
  for (const [id, job] of store) {
    if (now - job.createdAt > MAX_AGE_MS) {
      store.delete(id);
    }
  }
}

/**
 * Create a new job. Returns the job ID.
 * If a job with the same cacheKey is already processing, returns that instead.
 */
export function createJob(cacheKey: string): SentinelJob {
  purgeStale();

  // Dedup: return existing in-progress job for same cache key
  const existing = getJobByCacheKey(cacheKey);
  if (existing && existing.status === "processing") {
    return existing;
  }

  const jobId = crypto.randomUUID();
  const job: SentinelJob = {
    jobId,
    cacheKey,
    status: "processing",
    progress: "Starting...",
    step: 0,
    totalSteps: 5,
    createdAt: Date.now(),
  };

  getStore().set(jobId, job);
  return job;
}

/** Look up a job by its ID */
export function getJob(jobId: string): SentinelJob | undefined {
  return getStore().get(jobId);
}

/** Find an existing job by cache key (for deduplication) */
export function getJobByCacheKey(cacheKey: string): SentinelJob | undefined {
  for (const job of getStore().values()) {
    if (job.cacheKey === cacheKey) return job;
  }
  return undefined;
}

/** Update a job's progress in place */
export function updateJob(
  jobId: string,
  update: Partial<Pick<SentinelJob, "status" | "progress" | "step" | "error">>
): void {
  const job = getStore().get(jobId);
  if (!job) return;
  Object.assign(job, update);
}
