---
alwaysApply: true
---
## CODE STYLE RULES FOR DENO
- Use bare specifiers for dependencies defined in deno.json/imports
- Avoid direct jsr:/npm:/https: imports in source code
- Example: `import { assertEquals } from "@std/assert";` instead of `import { assertEquals } from "jsr:@std/assert";`
- Dockerfile Optimization:
  - Use `deno compile` to create static binaries for production Docker images
  - Implement multi-stage builds with compilation stage using `denoland/deno:latest` and minimal runtime stage using debian slim image.
  - Compile with explicit permissions (`--allow-net`, `--allow-read`, `--allow-env`) and copy only the compiled binary and necessary static files to the runtime stage
  - Set environment variables for proper network binding to ensure container accessibility
