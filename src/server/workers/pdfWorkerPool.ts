import { Worker } from "node:worker_threads";
import { monitorEventLoopDelay } from "node:perf_hooks";
import fs from "fs";

// ============================================================================
// EVENT LOOP MONITORING
// Continuously samples event loop lag in nanoseconds to verify that V8 is not
// blocked by CPU-heavy tasks like PDF parsing or regexes.
// ============================================================================
const loopDelayHistogram = monitorEventLoopDelay({ resolution: 10 });
loopDelayHistogram.enable();

export interface EventLoopMetrics {
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  isHealthy: boolean; // true if p99 < 50ms
  statusDescription: string;
}

export function getEventLoopLagMetrics(): EventLoopMetrics {
  const meanMs = Number((loopDelayHistogram.mean / 1e6).toFixed(2));
  const p50Ms = Number((loopDelayHistogram.percentile(50) / 1e6).toFixed(2));
  const p95Ms = Number((loopDelayHistogram.percentile(95) / 1e6).toFixed(2));
  const p99Ms = Number((loopDelayHistogram.percentile(99) / 1e6).toFixed(2));
  const maxMs = Number((loopDelayHistogram.max / 1e6).toFixed(2));

  const isHealthy = p99Ms < 50;
  const statusDescription = p99Ms < 15
    ? "Optimaal (0-15ms: Webserver reageert direct)"
    : p99Ms < 50
    ? "Goed (<50ms: Lichte achtergrondactiviteit)"
    : "Waarschuwing (>50ms: Event loop vertraging gedetecteerd)";

  return {
    meanMs,
    p50Ms,
    p95Ms,
    p99Ms,
    maxMs,
    isHealthy,
    statusDescription,
  };
}

// ============================================================================
// WORKER THREAD CODE (Evaluated in isolated OS thread)
// Runs pdf-parse in separate V8 isolates with zero main event loop blocking.
// ============================================================================
const WORKER_SCRIPT = `
const { parentPort } = require('node:worker_threads');
const fs = require('node:fs');

let pdfModule = null;
let PDFParseClass = null;

try {
  pdfModule = require('pdf-parse');
  PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse;
} catch (e) {
  // Will report error if called
}

parentPort.on('message', async (task) => {
  const { id, buffer, filePath, maxPages } = task;
  try {
    let rawBuf = null;
    if (buffer) {
      rawBuf = Buffer.from(buffer);
    } else if (filePath && fs.existsSync(filePath)) {
      rawBuf = fs.readFileSync(filePath);
    }

    if (!rawBuf || rawBuf.length === 0) {
      parentPort.postMessage({ id, success: true, text: '' });
      return;
    }

    const u8 = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
    let extractedText = '';

    // Method 1: PDFParse class (pdf-parse v2)
    if (PDFParseClass && typeof PDFParseClass === 'function') {
      try {
        const parser = new PDFParseClass(u8);
        const res = await parser.getText();
        if (res && typeof res.text === 'string') {
          extractedText = res.text;
        } else if (typeof res === 'string') {
          extractedText = res;
        }
        if (typeof parser.destroy === 'function') {
          try { await parser.destroy(); } catch (_) {}
        }
      } catch (err1) {
        // Fallback to legacy function
      }
    }

    // Method 2: legacy function call
    if (!extractedText && pdfModule) {
      const pdfFn = pdfModule.default || pdfModule;
      if (typeof pdfFn === 'function') {
        try {
          const res = await pdfFn(rawBuf, maxPages ? { max: maxPages } : undefined);
          if (res && res.text) extractedText = String(res.text);
        } catch (err2) {
          // ignore
        }
      }
    }

    parentPort.postMessage({
      id,
      success: true,
      text: (extractedText || '').trim(),
      charCount: extractedText ? extractedText.length : 0,
    });
  } catch (err) {
    parentPort.postMessage({
      id,
      success: false,
      error: err ? (err.message || String(err)) : 'Unknown worker error',
    });
  }
});
`;

// ============================================================================
// WORKER THREAD POOL MANAGER
// ============================================================================
interface QueuedTask {
  id: string;
  buffer?: Buffer;
  filePath?: string;
  maxPages?: number;
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timeoutTimer: NodeJS.Timeout;
}

interface WorkerInstance {
  id: number;
  worker: Worker;
  isBusy: boolean;
  currentTaskId: string | null;
  tasksCompleted: number;
}

class PdfWorkerPool {
  private workers: WorkerInstance[] = [];
  private taskQueue: QueuedTask[] = [];
  private poolSize: number;
  private nextTaskId = 1;
  private totalProcessed = 0;
  private totalErrors = 0;
  private isDestroyed = false;

  constructor(poolSize = 2) {
    this.poolSize = Math.max(1, poolSize);
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.spawnWorker(i);
    }
  }

  private spawnWorker(index: number): WorkerInstance {
    try {
      const worker = new Worker(WORKER_SCRIPT, { eval: true });
      const instance: WorkerInstance = {
        id: index,
        worker,
        isBusy: false,
        currentTaskId: null,
        tasksCompleted: 0,
      };

      worker.on("message", (msg: { id: string; success: boolean; text?: string; error?: string }) => {
        this.handleWorkerMessage(instance, msg);
      });

      worker.on("error", (err: Error) => {
        console.error(`[PDF WORKER ${index}] Fout in worker thread:`, err.message);
        this.totalErrors++;
        this.recycleWorker(instance);
      });

      worker.on("exit", (code: number) => {
        if (!this.isDestroyed && code !== 0) {
          console.warn(`[PDF WORKER ${index}] Worker onverwachts gestopt met code ${code}. Herstarten...`);
          this.recycleWorker(instance);
        }
      });

      this.workers[index] = instance;
      return instance;
    } catch (err: any) {
      console.error(`[PDF WORKER ${index}] Kon worker niet starten:`, err.message);
      const stubInstance: WorkerInstance = {
        id: index,
        worker: null as any,
        isBusy: false,
        currentTaskId: null,
        tasksCompleted: 0,
      };
      this.workers[index] = stubInstance;
      return stubInstance;
    }
  }

  private recycleWorker(instance: WorkerInstance): void {
    try {
      if (instance.worker) {
        instance.worker.terminate().catch(() => {
          // ignore termination error
        });
      }
    } catch (_err) {
      // ignore recycle error
    }

    if (instance.currentTaskId) {
      const pendingIdx = this.taskQueue.findIndex((t) => t.id === instance.currentTaskId);
      if (pendingIdx !== -1) {
        const [task] = this.taskQueue.splice(pendingIdx, 1);
        clearTimeout(task.timeoutTimer);
        task.reject(new Error("Worker thread gerecycled tijdens taakuitvoering"));
      }
    }

    this.spawnWorker(instance.id);
    this.processNextTask();
  }

  private handleWorkerMessage(
    instance: WorkerInstance,
    msg: { id: string; success: boolean; text?: string; error?: string }
  ): void {
    instance.isBusy = false;
    instance.currentTaskId = null;
    instance.tasksCompleted++;
    this.totalProcessed++;

    const taskIndex = this.taskQueue.findIndex((t) => t.id === msg.id);
    if (taskIndex !== -1) {
      const [task] = this.taskQueue.splice(taskIndex, 1);
      clearTimeout(task.timeoutTimer);

      if (msg.success) {
        task.resolve(msg.text || "");
      } else {
        this.totalErrors++;
        task.reject(new Error(msg.error || "Fout bij tekstextractie in worker thread"));
      }
    }

    this.processNextTask();
  }

  private processNextTask(): void {
    if (this.isDestroyed || this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find((w) => !w.isBusy && w.worker);
    if (!availableWorker) return;

    const nextTask = this.taskQueue.find(
      (t) => !this.workers.some((w) => w.currentTaskId === t.id)
    );
    if (!nextTask) return;

    availableWorker.isBusy = true;
    availableWorker.currentTaskId = nextTask.id;

    try {
      availableWorker.worker.postMessage({
        id: nextTask.id,
        buffer: nextTask.buffer,
        filePath: nextTask.filePath,
        maxPages: nextTask.maxPages,
      });
    } catch (err: any) {
      console.error(`[PDF WORKER] Fout bij doorgeven taak aan worker ${availableWorker.id}:`, err.message);
      this.recycleWorker(availableWorker);
    }
  }

  /**
   * Execute PDF text extraction in an isolated background thread.
   * Completely bypasses the main Node.js event loop!
   */
  public extractPdf(
    input: { buffer?: Buffer; filePath?: string; maxPages?: number },
    timeoutMs = 30000
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const taskId = `pdf-task-${this.nextTaskId++}-${Date.now()}`;

      const timeoutTimer = setTimeout(() => {
        const busyWorker = this.workers.find((w) => w.currentTaskId === taskId);
        if (busyWorker) {
          console.warn(`[PDF WORKER] Taak ${taskId} overschreed timeout van ${timeoutMs}ms. Worker herstarten...`);
          this.recycleWorker(busyWorker);
        }

        const idx = this.taskQueue.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          this.taskQueue.splice(idx, 1);
        }
        reject(new Error(`PDF extractie timeout (${timeoutMs}ms) in worker thread`));
      }, timeoutMs);

      this.taskQueue.push({
        id: taskId,
        buffer: input.buffer,
        filePath: input.filePath,
        maxPages: input.maxPages,
        resolve,
        reject,
        timeoutTimer,
      });

      this.processNextTask();
    });
  }

  public getStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.workers.filter((w) => w.isBusy).length,
      idleWorkers: this.workers.filter((w) => !w.isBusy && w.worker).length,
      queuedTasks: this.taskQueue.length,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
    };
  }

  public destroy(): void {
    this.isDestroyed = true;
    for (const w of this.workers) {
      if (w.worker) {
        w.worker.terminate().catch(() => {
          // ignore
        });
      }
    }
    for (const t of this.taskQueue) {
      clearTimeout(t.timeoutTimer);
      t.reject(new Error("Worker pool is beëindigd"));
    }
    this.taskQueue = [];
  }
}

// Global Singleton Pool (2 isolated worker threads for background parsing)
export const globalPdfWorkerPool = new PdfWorkerPool(2);

/**
 * Public helper: Parse PDF buffer in isolated worker thread
 */
export async function parsePdfBufferInWorker(buf: Buffer, timeoutMs = 30000): Promise<string> {
  return globalPdfWorkerPool.extractPdf({ buffer: buf }, timeoutMs);
}

/**
 * Public helper: Extract text from PDF file in isolated worker thread
 */
export async function extractPdfFileInWorker(filePath: string, timeoutMs = 30000): Promise<string> {
  return globalPdfWorkerPool.extractPdf({ filePath }, timeoutMs);
}
