import { spawn } from 'child_process';
import type { ProcessResult } from '@/lib/types';

/**
 * Reusable child process execution service.
 *
 * Both the PDAL service and the PotreeConverter service run external
 * binaries via `spawn` rather than `exec`, because:
 *   - spawn streams stdout/stderr incrementally (safer for very large logs)
 *   - spawn does not invoke a shell by default, avoiding shell-injection
 *     risk from filenames/paths
 *   - spawn gives us a real child process handle we can kill on timeout
 *
 * This module has no knowledge of PDAL or Potree specifically -- it is a
 * generic "run a command, capture output, enforce a timeout" utility that
 * both higher-level services compose.
 */

export interface RunProcessOptions {
  /** Executable to invoke (must already be resolved, e.g. via config). */
  command: string;
  /** Arguments passed to the executable. */
  args: string[];
  /** Working directory for the child process. */
  cwd?: string;
  /** Maximum time (ms) the process may run before being killed. */
  timeoutMs: number;
  /** Optional callback invoked with each stdout chunk, for live logging. */
  onStdout?: (chunk: string) => void;
  /** Optional callback invoked with each stderr chunk, for live logging. */
  onStderr?: (chunk: string) => void;
}

export async function runProcess(options: RunProcessOptions): Promise<ProcessResult> {
  const { command, args, cwd, timeoutMs, onStdout, onStderr } = options;

  const startedAt = Date.now();

  return new Promise<ProcessResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(command, args, {
        cwd,
        shell: false,
        windowsHide: true
      });
    } catch (spawnError) {
      // Executable not found, no permission, etc.
      resolve({
        success: false,
        exitCode: null,
        stdout: '',
        stderr: `Failed to start process "${command}": ${(spawnError as Error).message}`,
        durationMs: Date.now() - startedAt
      });
      return;
    }

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      // SIGTERM first; processes that ignore it will be reaped by the OS
      // when the Node process eventually exits. We avoid SIGKILL here so
      // PotreeConverter/PDAL can flush partial output where possible.
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stdout += text;
      onStdout?.(text);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      stderr += text;
      onStderr?.(text);
    });

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: false,
        exitCode: null,
        stdout,
        stderr: stderr + `\nProcess error: ${err.message}`,
        durationMs: Date.now() - startedAt
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutHandle);

      if (timedOut) {
        resolve({
          success: false,
          exitCode: code,
          stdout,
          stderr: stderr + `\nProcess timed out after ${timeoutMs}ms and was terminated.`,
          durationMs: Date.now() - startedAt
        });
        return;
      }

      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
  });
}
