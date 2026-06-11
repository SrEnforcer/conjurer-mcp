import { resolveSpecPath, buildIndex } from '@conjurer/core';
import type { SymbolIndex, SpecReader } from '@conjurer/core';
import { isSome, isOk, intoMap } from '@tsfpp/prelude';

export type CoreBridge = {
  readonly symbolIndex: SymbolIndex;
  readonly specReader: SpecReader;
};

const emptyIndex: SymbolIndex = { symbols: intoMap([]), grimoires: intoMap([]) };

export const createCoreBridge = (): CoreBridge => {
  const pathOpt = resolveSpecPath();
  if (!isSome(pathOpt)) {
    return { symbolIndex: emptyIndex, specReader: { specPath: '' } };
  }
  const reader: SpecReader = { specPath: pathOpt.value };
  const indexResult = buildIndex(reader);
  if (!isOk(indexResult)) {
    return { symbolIndex: emptyIndex, specReader: reader };
  }
  return { symbolIndex: indexResult.value, specReader: reader };
};
