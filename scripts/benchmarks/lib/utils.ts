import { join } from "@std/path";

/**
 * Runs a git command in the specified directory.
 */
export async function runGit(cwd: string, args: string[]) {
  const cmd = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();
  if (!output.success) {
    const stderr = new TextDecoder().decode(output.stderr);
    throw new Error(`Git command failed: git ${args.join(" ")}\n${stderr}`);
  }
  return output;
}

/**
 * Initializes a git repository in the specified directory with a default user.
 */
export async function setupGitRepo(path: string) {
  await runGit(path, ["init"]);
  await runGit(path, ["config", "user.name", "Benchmark Bot"]);
  await runGit(path, ["config", "user.email", "bot@example.com"]);
}

/**
 * Recursively copies a directory or file.
 */
export async function copyRecursive(src: string, dest: string) {
  const stat = await Deno.stat(src);
  if (stat.isDirectory) {
    await Deno.mkdir(dest, { recursive: true });
    for await (const entry of Deno.readDir(src)) {
      await copyRecursive(join(src, entry.name), join(dest, entry.name));
    }
  } else {
    await Deno.copyFile(src, dest);
  }
}
