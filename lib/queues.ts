import Queue from "bull";

export type ConversionJob = {
  conversionId: string;
  userId: string;
  sourceKey: string;
  sourceName: string;
  sourceFormat: string;
  outputFormat: string;
  privacyMode: boolean;
  options?: Record<string, unknown>;
};

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

let queue: Queue.Queue<ConversionJob> | null = null;

function getQueue() {
  if (queue) return queue;
  queue = new Queue<ConversionJob>("conversions", {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  });
  queue.on("completed", (job) => console.log(`Job ${job.id} completed`));
  queue.on("failed", (job, error) => console.error(`Job ${job.id} failed:`, error.message));
  return queue;
}

/**
 * Add a conversion job to the queue
 */
export async function queueConversion(data: ConversionJob) {
  try {
    const job = await getQueue().add(data, {
      jobId: data.conversionId,
    });
    console.log(`📝 Queued job: ${job.id}`);
    return job;
  } catch (error) {
    console.error("Failed to queue conversion:", error);
    throw error;
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await getQueue().getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress();

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
  };
}

/**
 * Remove a job from queue
 */
export async function removeJob(jobId: string) {
  const job = await getQueue().getJob(jobId);
  if (job) {
    await job.remove();
  }
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const counts = await getQueue().getJobCounts();
  return {
    active: counts.active,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    waiting: counts.waiting,
  };
}

export default getQueue;
