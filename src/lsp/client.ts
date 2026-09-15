import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { obfuskuLspPath } from "../cli/run-cli";

export function createLanguageClient(): LanguageClient {
  const serverOptions: ServerOptions = {
    command: obfuskuLspPath(),
    args: [],
    transport: TransportKind.stdio,
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "obfusku" }],
  };

  return new LanguageClient("obfusku", "Obfusku Language Server", serverOptions, clientOptions);
}
