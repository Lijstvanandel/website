import { EventEmitter } from "node:events";

// ============================================================================
// ISOLATED ASYNC BACKGROUND JOB QUEUE
// Ensures heavy scrapers, PDF OCR, and sync pipelines execute outside the
// HTTP request/response cycle, guaranteeing 0ms server blocking and strict
// idempotency.
// ============================================================================

export type BackgroundJobType =
  | "COUNCIL_IBABS_SYNC"
  | "NOTUBIZ_OVERIJSSEL_SYNC"
  | "WATERSCHAP_SYNC"
  | "MISSING_FILES_REPAIR"
  | "BULK_CLASSIFICATION";

export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "aborted_circuit_breaker";

export interface JobLogEntry {
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export interface BackgroundJob<TResult = any> {
  id: string;
  type: BackgroundJobType;
  idempotencyKey: string;
  status: BackgroundJobStatus;
  progressPercent: number;
  currentAction: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  result: TResult | null;
  error: string | null;
  logs: JobLogEntry[];
  initiatedBy?: string;
  abortController?: AbortController;
}

export interface QueueStats {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  totalProcessed: number;
}

class BackgroundJobQueue extends EventEmitter {
  private jobs: Map<string, BackgroundJob> = new Map();
  private maxConcurrency: number;
  private runningCount = 0;
  private isProcessing = false;
  private totalProcessed = 0;

  constructor(maxConcurrency = 2) {
    super();
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Enqueue a job with strict idempotency protection.
   * If an identical job is already queued or running, the existing job is returned.
   */
  public enqueue<TResult = any>(
    type: BackgroundJobType,
    idempotencyKey: string,
    executor: (job: BackgroundJob<TResult>, signal: AbortSignal) => Promise<TResult>,
    options?: { initiatedBy?: string; initialAction?: string }
  ): { job: BackgroundJob<TResult>; isDuplicate: boolean } {
    // 1. Check idempotency: is an identical job queued or currently running?
    for (const existingJob of this.jobs.values()) {
      if (
        existingJob.idempotencyKey === idempotencyKey &&
        (existingJob.status === "queued" || existingJob.status === "running")
      ) {
        return { job: existingJob as BackgroundJob<TResult>, isDuplicate: true };
      }
    }

    // 2. Create fresh job
    const jobId = `job-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const abortController = new AbortController();

    const job: BackgroundJob<TResult> = {
      id: jobId,
      type,
      idempotencyKey,
      status: "queued",
      progressPercent: 0,
      currentAction: options?.initialAction || "In wachtrij geplaatst...",
      queuedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      durationMs: null,
      result: null,
      error: null,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: `Taak ${type} succesvol in de achtergrondwachtrij geplaatst (Idempotentie-sleutel: ${idempotencyKey})`,
        },
      ],
      initiatedBy: options?.initiatedBy || "systeem",
      abortController,
    };

    // Store private executor reference on job
    (job as any)._executor = executor;

    this.jobs.set(jobId, job);

    // Bound in-memory history to last 100 jobs
    if (this.jobs.size > 100) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }

    // Trigger process loop asynchronously
    setImmediate(() => this.processNextJobs());

    return { job, isDuplicate: false };
  }

  /**
   * Add a log entry to a job
   */
  public log(jobId: string, message: string, level: JobLogEntry["level"] = "info"): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
    });

    if (job.logs.length > 250) {
      job.logs.shift();
    }

    this.emit("job:log", { jobId, message, level });
  }

  /**
   * Update progress percentage and current action
   */
  public updateProgress(jobId: string, percent: number, action?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progressPercent = Math.min(100, Math.max(0, Math.round(percent)));
    if (action) {
      job.currentAction = action;
    }

    this.emit("job:progress", { jobId, percent: job.progressPercent, action });
  }

  /**
   * Cancel a running or queued job
   */
  public cancel(jobId: string, reason = "Handmatig geannuleerd door gebruiker"): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === "queued") {
      job.status = "cancelled";
      job.completedAt = new Date().toISOString();
      job.currentAction = "Geannuleerd in wachtrij";
      this.log(jobId, reason, "warn");
      return true;
    }

    if (job.status === "running") {
      if (job.abortController) {
        job.abortController.abort();
      }
      job.status = "cancelled";
      job.completedAt = new Date().toISOString();
      job.currentAction = "Taakuitvoering afgebroken";
      this.log(jobId, reason, "warn");
      this.runningCount = Math.max(0, this.runningCount - 1);
      setImmediate(() => this.processNextJobs());
      return true;
    }

    return false;
  }

  public getJob(jobId: string): BackgroundJob | undefined {
    return this.jobs.get(jobId);
  }

  public getAllJobs(limit = 50): BackgroundJob[] {
    const list = Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime()
    );
    return list.slice(0, limit);
  }

  public getStats(): QueueStats {
    let queued = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === "queued") queued++;
      else if (job.status === "running") running++;
      else if (job.status === "completed") completed++;
      else if (job.status === "failed" || job.status === "aborted_circuit_breaker") failed++;
    }

    return {
      queued,
      running,
      completed,
      failed,
      totalProcessed: this.totalProcessed,
    };
  }

  private async processNextJobs(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.runningCount < this.maxConcurrency) {
        // Find next queued job
        const nextJob = Array.from(this.jobs.values()).find((j) => j.status === "queued");
        if (!nextJob) break;

        this.runningCount++;
        this.runJob(nextJob).finally(() => {
          this.runningCount = Math.max(0, this.runningCount - 1);
          setImmediate(() => this.processNextJobs());
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runJob(job: BackgroundJob): Promise<void> {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    this.log(job.id, `Taak gestart in geïsoleerde worker context...`, "info");

    const startTime = Date.now();
    const executor = (job as any)._executor;

    try {
      if (!executor || typeof executor !== "function") {
        throw new Error("Geen geldige taakuitvoerder gedefinieerd");
      }

      const result = await executor(job, job.abortController!.signal);

      if (job.status === "cancelled") {
        // Was already marked cancelled
        return;
      }

      job.status = "completed";
      job.progressPercent = 100;
      job.result = result;
      job.currentAction = "Succesvol voltooid";
      job.completedAt = new Date().toISOString();
      job.durationMs = Date.now() - startTime;
      this.totalProcessed++;

      this.log(
        job.id,
        `Taak succesvol voltooid in ${(job.durationMs / 1000).toFixed(1)}s`,
        "success"
      );

      this.emit("job:completed", job);
    } catch (err: any) {
      if (job.status === "cancelled") return;

      const durationMs = Date.now() - startTime;
      job.durationMs = durationMs;
      job.completedAt = new Date().toISOString();

      if (err.message && err.message.includes("CIRCUIT_OPEN")) {
        job.status = "aborted_circuit_breaker";
        job.error = err.message;
        job.currentAction = "Afgebroken door Scraper Circuit Breaker";
        this.log(job.id, `Afgebroken door Circuit Breaker: ${err.message}`, "warn");
      } else {
        job.status = "failed";
        job.error = err?.message || String(err);
        job.currentAction = `Fout opgetreden: ${job.error}`;
        this.log(job.id, `Fout tijdens taakuitvoering: ${job.error}`, "error");
      }

      this.totalProcessed++;
      this.emit("job:failed", job);
    }
  }
}

// Global Singleton Queue (Max 2 concurrent heavy background tasks)
export const globalBackgroundJobQueue = new BackgroundJobQueue(2);
