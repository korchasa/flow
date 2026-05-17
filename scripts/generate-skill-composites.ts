/**
 * Composite Skill Generator (FR-SKILL-COMPOSE).
 *
 * Reads framework/composites.yaml and materializes SKILL.md files for every
 * atom and composite into their canonical paths. Replaces the legacy
 * "hand-copy + check-skill-sync.ts" duplication pattern.
 *
 * Modes:
 *   --check   regenerate into memory, diff-compare to on-disk SKILL.md,
 *             exit 1 on drift with a per-file unified diff + --write hint.
 *             Default behaviour when invoked from `deno task check`.
 *   --write   write regenerated SKILL.md files in place.
 *
 * Deterministic output: stable YAML key order, LF line endings, no
 * timestamps. Same manifest + same atoms => same bytes across runs.
 *
 * See documents/tasks/2026/05/generate-skills-from-atoms.md for the design.
 */
import { parse as parseYaml } from "@std/yaml";

export const MANIFEST_PATH = "framework/composites.yaml";

export interface AtomEntry {
  /** Source `_atom.md` path (sibling of generated SKILL.md). */
  source: string;
  /** Target `SKILL.md` path. */
  target: string;
  /** Default values for the atom's `{{PARAM}}` placeholders. */
  default_params?: Record<string, string>;
}

export interface CompositePhase {
  /** Free-form phase title rendered as `### <title>`. */
  title: string;
  /** Atom id referenced from `atoms:`. Mutually exclusive with `inline`. */
  atom?: string;
  /** When true, the phase body is supplied by the composite wrapper. */
  inline?: boolean;
  /** Per-phase overrides for atom params. */
  params?: Record<string, string>;
}

export interface CompositeEntry {
  /** Target `SKILL.md` path. */
  target: string;
  /** Wrapper `_composite.md` path (sibling of generated SKILL.md). */
  wrapper: string;
  /** Ordered list of phases. */
  phases: CompositePhase[];
}

export interface Manifest {
  schema_version: number;
  atoms: Record<string, AtomEntry>;
  composites: Record<string, CompositeEntry>;
}

/** Loads + validates the manifest at MANIFEST_PATH (or supplied path). */
export async function loadManifest(
  path: string = MANIFEST_PATH,
): Promise<Manifest> {
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (e) {
    throw new Error(
      `[generate-skill-composites] manifest not found at ${path}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (e) {
    throw new Error(
      `[generate-skill-composites] malformed YAML in ${path}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `[generate-skill-composites] manifest ${path} is empty or not an object`,
    );
  }
  const obj = parsed as Record<string, unknown>;
  const schemaVersion = obj.schema_version;
  if (typeof schemaVersion !== "number") {
    throw new Error(
      `[generate-skill-composites] ${path}: missing or non-numeric schema_version`,
    );
  }
  if (schemaVersion !== 1) {
    throw new Error(
      `[generate-skill-composites] ${path}: unsupported schema_version ${schemaVersion} (expected 1)`,
    );
  }
  const atoms = (obj.atoms ?? {}) as Record<string, AtomEntry>;
  const composites = (obj.composites ?? {}) as Record<string, CompositeEntry>;
  validateManifestRefs(atoms, composites, path);
  return { schema_version: schemaVersion, atoms, composites };
}

/** Cross-checks that every composite phase's `atom:` exists in `atoms:`. */
function validateManifestRefs(
  atoms: Record<string, AtomEntry>,
  composites: Record<string, CompositeEntry>,
  path: string,
): void {
  for (const [compId, comp] of Object.entries(composites)) {
    if (!Array.isArray(comp.phases)) {
      throw new Error(
        `[generate-skill-composites] ${path}: composite '${compId}' missing 'phases:' list`,
      );
    }
    for (const [i, phase] of comp.phases.entries()) {
      const has_atom = typeof phase.atom === "string" && phase.atom.length > 0;
      const inline = phase.inline === true;
      if (has_atom === inline) {
        throw new Error(
          `[generate-skill-composites] ${path}: composite '${compId}' phase #${
            i + 1
          } must specify exactly one of 'atom:' or 'inline: true'`,
        );
      }
      if (has_atom && !(phase.atom! in atoms)) {
        throw new Error(
          `[generate-skill-composites] ${path}: composite '${compId}' phase #${
            i + 1
          } references unknown atom '${phase.atom}'`,
        );
      }
    }
  }
}

/** Render plan: a target path and the rendered SKILL.md body. */
export interface RenderedTarget {
  target: string;
  /** Relative source paths used (for the GENERATED-FROM marker). */
  sources: string[];
  body: string;
}

/**
 * Renders every target listed in the manifest. Pure: does not touch disk for
 * targets (only reads atom/wrapper sources). Returns a deterministic list.
 *
 * Commit-1 skeleton: empty manifest yields an empty list. Commit-2+ extend
 * with atom rendering; Commit-4+ with composite rendering.
 */
export async function renderAll(manifest: Manifest): Promise<RenderedTarget[]> {
  const out: RenderedTarget[] = [];
  // Stable iteration order: sort atoms then composites by id.
  for (const id of Object.keys(manifest.atoms).sort()) {
    out.push(await renderAtomTarget(id, manifest.atoms[id]));
  }
  for (const id of Object.keys(manifest.composites).sort()) {
    out.push(await renderCompositeTarget(id, manifest));
  }
  return out;
}

/** Placeholder for the atom-render pipeline (Commit 2). */
export function renderAtomTarget(
  _id: string,
  _entry: AtomEntry,
): Promise<RenderedTarget> {
  throw new Error(
    "[generate-skill-composites] atom rendering not implemented yet (Commit 2 introduces it)",
  );
}

/** Placeholder for the composite-render pipeline (Commit 4). */
export function renderCompositeTarget(
  _id: string,
  _m: Manifest,
): Promise<RenderedTarget> {
  throw new Error(
    "[generate-skill-composites] composite rendering not implemented yet (Commit 4 introduces it)",
  );
}

/** Compare rendered targets against on-disk; return per-target unified diffs. */
export async function diffAgainstDisk(
  rendered: RenderedTarget[],
): Promise<Array<{ target: string; diff: string }>> {
  const drifts: Array<{ target: string; diff: string }> = [];
  for (const r of rendered) {
    let onDisk = "";
    try {
      onDisk = await Deno.readTextFile(r.target);
    } catch {
      // Missing file is treated as max drift.
    }
    if (onDisk !== r.body) {
      drifts.push({
        target: r.target,
        diff: unifiedDiff(onDisk, r.body, r.target),
      });
    }
  }
  return drifts;
}

/** Minimal line-based unified diff. No external deps; sufficient for CI output. */
export function unifiedDiff(a: string, b: string, label: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const out: string[] = [
    `--- ${label} (on-disk)`,
    `+++ ${label} (regenerated)`,
  ];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    const x = aLines[i];
    const y = bLines[i];
    if (x === y) {
      out.push(`  ${x ?? ""}`);
      continue;
    }
    if (x !== undefined) out.push(`- ${x}`);
    if (y !== undefined) out.push(`+ ${y}`);
  }
  return out.join("\n");
}

/** Write a rendered SKILL.md target to disk (creates parent dirs). */
export async function writeTarget(r: RenderedTarget): Promise<void> {
  const dir = r.target.replace(/\/[^/]+$/, "");
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(r.target, r.body);
}

/** List the targets the generator would write (one per line on stdout). */
export async function listTargets(): Promise<string[]> {
  const manifest = await loadManifest();
  const out: string[] = [];
  for (const id of Object.keys(manifest.atoms).sort()) {
    out.push(manifest.atoms[id].target);
  }
  for (const id of Object.keys(manifest.composites).sort()) {
    out.push(manifest.composites[id].target);
  }
  return out;
}

async function main(args: string[]): Promise<number> {
  const mode = args.includes("--write")
    ? "write"
    : args.includes("--list-targets")
    ? "list"
    : "check";
  const manifest = await loadManifest();
  if (mode === "list") {
    const targets = await listTargets();
    console.log(targets.join("\n"));
    return 0;
  }
  const rendered = await renderAll(manifest);
  if (mode === "write") {
    for (const r of rendered) await writeTarget(r);
    console.log(
      `[generate-skill-composites] wrote ${rendered.length} target(s)`,
    );
    return 0;
  }
  const drifts = await diffAgainstDisk(rendered);
  if (drifts.length === 0) {
    if (rendered.length === 0) {
      console.log(
        "[generate-skill-composites] manifest is empty; nothing to regenerate",
      );
    } else {
      console.log(
        `[generate-skill-composites] ${rendered.length} target(s) up-to-date`,
      );
    }
    return 0;
  }
  for (const d of drifts) {
    console.error(d.diff);
    console.error("");
  }
  console.error(
    `[generate-skill-composites] ${drifts.length} target(s) out of sync. ` +
      `Run: deno run -A scripts/generate-skill-composites.ts --write`,
  );
  return 1;
}

if (import.meta.main) {
  try {
    const code = await main(Deno.args);
    Deno.exit(code);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    Deno.exit(1);
  }
}
