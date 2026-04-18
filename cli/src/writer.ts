import type { FsAdapter } from "./adapters/fs.ts";
import type { PlanItem, PlanItemType } from "./types.ts";

/** Error entry emitted by writeFiles — carries the source primitive identity
 * (name + type) so the renderer can mark the matching ResourceAction as
 * `failed` and keep the CREATED/UPDATED counter truthful. */
interface WriteError {
  path: string;
  error: string;
  name: string;
  type: PlanItemType;
}

/** Result of write operation */
interface WriteResult {
  written: number;
  skipped: number;
  deleted: number;
  errors: WriteError[];
}

/** Write files according to plan */
export async function writeFiles(
  plan: PlanItem[],
  fs: FsAdapter,
): Promise<WriteResult> {
  const result: WriteResult = {
    written: 0,
    skipped: 0,
    deleted: 0,
    errors: [],
  };

  for (const item of plan) {
    if (item.action === "ok") {
      result.skipped++;
      continue;
    }

    if (item.action === "delete") {
      try {
        await fs.remove(item.targetPath);
        result.deleted++;
      } catch (e) {
        result.errors.push({
          path: item.targetPath,
          error: (e as Error).message,
          name: item.name,
          type: item.type,
        });
      }
      continue;
    }

    try {
      await fs.writeFile(item.targetPath, item.content);
      result.written++;
    } catch (e) {
      result.errors.push({
        path: item.targetPath,
        error: (e as Error).message,
        name: item.name,
        type: item.type,
      });
    }
  }

  return result;
}
