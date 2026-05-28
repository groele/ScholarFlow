/**
 * Retry utility for network and transient operations.
 * Uses exponential backoff with jitter.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 10000) */
  maxDelay?: number;
  /** Optional predicate to decide if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  isRetryable: isTransientError,
}

/**
 * Default retryable error check: network errors, 5xx, 429 (rate limit).
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch() throws TypeError on network failure
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('fetch') ||
      msg.includes('timeout') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('500') ||
      msg.includes('502') ||
      msg.includes('503') ||
      msg.includes('504')
    );
  }
  return false;
}

function getDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, maxDelay);
}

/**
 * Wraps an async function with retry logic and exponential backoff.
 *
 * @throws The last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLast = attempt === opts.maxAttempts - 1;
      if (isLast || !opts.isRetryable(error)) {
        throw error;
      }
      const delay = getDelay(attempt, opts.baseDelay, opts.maxDelay);
      console.warn(`Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
