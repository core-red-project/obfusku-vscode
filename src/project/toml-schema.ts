import * as path from 'node:path';
import * as vscode from 'vscode';

const EVEN_BETTER_TOML_EXTENSION_ID = 'tamasfe.even-better-toml';
const MANIFEST_GLOB = '**/obfusku.toml';

/**
 * Best-effort: if the "Even Better TOML" extension is installed, register
 * our bundled JSON Schema for `obfusku.toml` against its
 * `evenBetterToml.schema.associations` setting. `obfusku.toml` is TOML,
 * not JSON, so VS Code's own `contributes.jsonValidation` (JSON-only)
 * cannot express this association — this is the TOML-tooling equivalent.
 * A no-op, not an error, if that extension isn't present.
 */
export async function registerTomlSchemaAssociation(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (!vscode.extensions.getExtension(EVEN_BETTER_TOML_EXTENSION_ID)) {
    return;
  }
  const schemaUri = vscode.Uri.file(
    context.asAbsolutePath(path.join('schemas', 'obfusku-toml.schema.json')),
  ).toString();

  const config = vscode.workspace.getConfiguration('evenBetterToml');
  const associations = config.get<Record<string, string>>('schema.associations') ?? {};
  if (associations[MANIFEST_GLOB] === schemaUri) {
    return;
  }
  try {
    await config.update(
      'schema.associations',
      { ...associations, [MANIFEST_GLOB]: schemaUri },
      vscode.ConfigurationTarget.Global,
    );
  } catch {
    // Best-effort — an unexpected settings shape from a future version of
    // that extension should never block our own activation.
  }
}
