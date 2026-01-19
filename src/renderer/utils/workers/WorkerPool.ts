/**
 * WorkerPool for managing parallel indicator calculation tasks
 * Allows running multiple quadStoch calculations concurrently
 */

export interface WorkerTask<T = any> {
  id: string;
  type: string;
  payload: any;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private activeTasks: Map<number, WorkerTask> = new Map();
  private maxWorkers: number;
  private workerScript: string;

  constructor(workerScript: string, maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.workerScript = workerScript;
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 to prevent resource exhaustion
    this.init();
  }

  private init() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL(this.workerScript, import.meta.url), {
        type: 'module'
      });
      
      worker.onmessage = (e: MessageEvent) => this.handleWorkerMessage(i, e);
      worker.onerror = (e: ErrorEvent) => this.handleWorkerError(i, e);
      
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(workerIndex: number, event: MessageEvent) {
    const task = this.activeTasks.get(workerIndex);
    if (task) {
      const { payload, error } = event.data;
      
      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(payload);
      }
      
      this.activeTasks.delete(workerIndex);
      this.processNext(workerIndex);
    }
  }

  private handleWorkerError(workerIndex: number, event: ErrorEvent) {
    const task = this.activeTasks.get(workerIndex);
    if (task) {
      task.reject(event.error || new Error('Worker error'));
      this.activeTasks.delete(workerIndex);
      
      // Recreate worker if it crashed
      this.workers[workerIndex].terminate();
      const newWorker = new Worker(new URL(this.workerScript, import.meta.url), {
        type: 'module'
      });
      newWorker.onmessage = (e) => this.handleWorkerMessage(workerIndex, e);
      newWorker.onerror = (e) => this.handleWorkerError(workerIndex, e);
      this.workers[workerIndex] = newWorker;
      
      this.processNext(workerIndex);
    }
  }

  private processNext(workerIndex: number) {
    if (this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.activeTasks.set(workerIndex, task);
      this.workers[workerIndex].postMessage({
        id: task.id,
        type: task.type,
        payload: task.payload
      });
    }
  }

  public execute<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T> = {
        id: Math.random().toString(36).substring(7),
        type,
        payload,
        resolve,
        reject
      };

      // Find idle worker
      const idleWorkerIndex = this.workers.findIndex((_, i) => !this.activeTasks.has(i));
      
      if (idleWorkerIndex !== -1) {
        this.activeTasks.set(idleWorkerIndex, task);
        this.workers[idleWorkerIndex].postMessage({
          id: task.id,
          type: task.type,
          payload: task.payload
        });
      } else {
        this.queue.push(task);
      }
    });
  }

  public terminate() {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
    this.activeTasks.clear();
  }
}

// Singleton instance for the app
export const quadStochWorkerPool = new WorkerPool('../../workers/quadStoch.worker.ts', 4);
