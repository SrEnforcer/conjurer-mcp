import { isOk, intoMap } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import { toCnjModel } from '../cnj-model.js';
import type { CnjDocument } from '../cnj-model.js';

export const parseDoc = (src: string): CnjDocument | undefined => {
  const r = parse(src);
  if (!isOk(r)) return undefined;
  const m = toCnjModel(r.value, 'test.cnj');
  return isOk(m) ? m.value : undefined;
};

export const emptyDoc: CnjDocument = {
  charter: {
    title: '',
    version: '',
    updated: '',
    goals: [],
    decisions: [],
    open: [],
    references: [],
    outputs: intoMap([]),
    audience: intoMap([]),
  },
  assets: [],
  targets: [],
  domainForms: [],
  candidates: [],
  hoists: [],
  reassessments: [],
  sourceFile: 'test.cnj',
};

export const validDoc: CnjDocument = {
  charter: {
    title: 'My Project',
    version: '1.0.0',
    updated: '',
    goals: ['Be useful'],
    decisions: [],
    open: [],
    references: [],
    outputs: intoMap([]),
    audience: intoMap([]),
  },
  assets: [],
  targets: [],
  domainForms: [],
  candidates: [],
  hoists: [],
  reassessments: [],
  sourceFile: 'test.cnj',
};
