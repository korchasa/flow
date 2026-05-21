import { assertEquals } from "@std/assert";
import {
  autoInstallEnabled,
  codexInstalledFlowaiPluginsFromConfig,
  ENV_AUTO_INSTALL_PLUGINS,
  installedClaudeFlowaiPluginIds,
} from "./auto-install-plugins.ts";

Deno.test("autoInstallEnabled: reads explicit true from dotenv content", () => {
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=true\n`),
    true,
  );
});

Deno.test("autoInstallEnabled: only exact true enables auto-install", () => {
  assertEquals(autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=1\n`), false);
  assertEquals(
    autoInstallEnabled(`${ENV_AUTO_INSTALL_PLUGINS}=false\n`),
    false,
  );
  assertEquals(autoInstallEnabled("AUTO_INSTALL_PLPUGINS=true\n"), false);
});

Deno.test("installedClaudeFlowaiPluginIds: returns enabled user flowai marketplace plugins", () => {
  const installed = installedClaudeFlowaiPluginIds([
    { id: "flowai@flowai-plugins", scope: "user", enabled: true },
    { id: "flowai-deno@flowai-plugins", scope: "user", enabled: false },
    { id: "flowai-devtools@flowai-plugins", scope: "project", enabled: true },
    { id: "playground@claude-plugins-official", scope: "user", enabled: true },
  ]);

  assertEquals(installed, ["flowai@flowai-plugins"]);
});

Deno.test("codexInstalledFlowaiPluginsFromConfig: reads enabled flowai plugin tables", () => {
  const installed = codexInstalledFlowaiPluginsFromConfig(`
[plugins."flowai@flowai-plugins"]
enabled = true

[plugins."flowai-deno@flowai-plugins"]
enabled = false

[plugins."playground@claude-plugins-official"]
enabled = true
`);

  assertEquals(installed, ["flowai@flowai-plugins"]);
});
