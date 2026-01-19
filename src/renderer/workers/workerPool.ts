type WorkerTask = {
  id: string;
  type: string;
  payload: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
};

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerTaskMap: Map<Worker, WorkerTask> = new Map();
  
  constructor(
    private workerScript: URL,
    private poolSize: number = navigator.hardwareConcurrency || 4
  ) {
    this.initializeWorkers();
  }
  
  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });
      
      worker.onmessage = (e) => {
        const task = this.workerTaskMap.get(worker);
        if (task) {
          if (e.data.type === 'ERROR') {
            task.reject(new Error(e.data.payload.message));
          } else {
            task.resolve(e.data.payload);
          }
          
          this.workerTaskMap.delete(worker);
          this.busyWorkers.delete(worker);
          this.processQueue();
        }
      };
      
      worker.onerror = (e) => {
        const task = this.workerTaskMap.get(worker);
        if (task) {
          task.reject(new Error(e.message));
          this.workerTaskMap.delete(worker);
          this.busyWorkers.delete(worker);
        }
      };
      
      this.workers.push(worker);
    }
  }
  
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));
    if (!availableWorker) return;
    
    const task = this.taskQueue.shift()!;
    this.busyWorkers.add(availableWorker);
    this.workerTaskMap.set(availableWorker, task);
    
    availableWorker.postMessage({
      type: task.type,
      payload: task.payload,
      requestId: task.id,
    });
  }
  
  async execute<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        payload,
        resolve,
        reject,
      };
      
      this.taskQueue.push(task);
      this.processQueue();
    });
  }
  
  // Process multiple symbols in parallel
  async executeParallel<T>(
    type: string,
    payloads: any[]
  ): Promise<T[]> {
    return Promise.all(
      payloads.map(payload => this.execute<T>(type, payload))
    );
  }
  
  terminate(): void {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.busyWorkers.clear();
    this.taskQueue = [];
  }
}
