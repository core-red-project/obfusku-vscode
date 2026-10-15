import { describe, expect, it } from 'vitest';
import { capabilitiesFor, parseVersion } from '../../src/cli/cli-info';

describe('parseVersion', () => {
  it('reads the CLI banner', () => {
    expect(parseVersion('obfusku 1.1.0\n')).toEqual({ major: 1, minor: 1, patch: 0 });
  });

  it('reads a pre-release', () => {
    expect(parseVersion('obfusku 1.2.0-rc.1')).toEqual({ major: 1, minor: 2, patch: 0 });
  });

  it('gives up on text without a version', () => {
    expect(parseVersion('usage: obfusku <command>')).toBeUndefined();
  });
});

describe('capabilitiesFor', () => {
  it('1.0.x keeps to the text diagnostics and refuses to format', () => {
    const info = capabilitiesFor({ major: 1, minor: 0, patch: 0 });
    expect(info).toMatchObject({ supported: true, json: false, safeFormat: false, test: false });
  });

  it('1.1.x has JSON diagnostics, a comment-safe formatter and test', () => {
    const info = capabilitiesFor({ major: 1, minor: 1, patch: 0 });
    expect(info).toMatchObject({ supported: true, json: true, safeFormat: true, test: true });
  });

  it('a later 1.x keeps every 1.1 feature', () => {
    expect(capabilitiesFor({ major: 1, minor: 4, patch: 2 })).toMatchObject({
      supported: true,
      json: true,
    });
  });

  it('2.x is outside the tested range, 0.x below it', () => {
    expect(capabilitiesFor({ major: 2, minor: 0, patch: 0 }).supported).toBe(false);
    expect(capabilitiesFor({ major: 0, minor: 9, patch: 0 }).supported).toBe(false);
  });
});
