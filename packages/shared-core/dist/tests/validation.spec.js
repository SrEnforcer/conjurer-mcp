import { describe, it, expect } from 'vitest';
import { isOk, intoMap } from '@tsfpp/prelude';
import { parse } from '../edn-parser.js';
import { toCnjModel } from '../cnj-model.js';
import { validateCnj, checkSymbolUsage, checkReferences, lintConventions } from '../validation.js';
const parseDoc = (src) => {
    const r = parse(src);
    if (!isOk(r))
        return undefined;
    const m = toCnjModel(r.value, 'test.cnj');
    return isOk(m) ? m.value : undefined;
};
const emptyDoc = {
    charter: {
        title: '',
        version: '',
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
    sourceFile: 'test.cnj',
};
const validDoc = {
    charter: {
        title: 'My Project',
        version: '1.0.0',
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
    sourceFile: 'test.cnj',
};
describe('validateCnj — authored mode', () => {
    it('returns valid for a well-formed doc', () => {
        const report = validateCnj(validDoc, 'authored');
        expect(report.valid).toBe(true);
        expect(report.violations.length).toBe(0);
        expect(report.mode).toBe('authored');
    });
    it('returns charter-title error for empty title', () => {
        const report = validateCnj(emptyDoc, 'authored');
        expect(report.valid).toBe(false);
        const titles = report.violations.filter((v) => v.rule === 'charter-title');
        expect(titles.length).toBe(1);
        expect(titles[0]?.severity).toBe('error');
    });
    it('returns charter-version error for bad version', () => {
        const report = validateCnj(emptyDoc, 'authored');
        const vers = report.violations.filter((v) => v.rule === 'charter-version');
        expect(vers.length).toBe(1);
        expect(vers[0]?.severity).toBe('error');
    });
    it('returns charter-goals warning for zero goals', () => {
        const doc = {
            ...validDoc,
            charter: { ...validDoc.charter, goals: [] },
        };
        const report = validateCnj(doc, 'authored');
        const goals = report.violations.filter((v) => v.rule === 'charter-goals');
        expect(goals.length).toBe(1);
        expect(goals[0]?.severity).toBe('warning');
    });
    it('doc with goals-warning only is still valid', () => {
        const doc = {
            ...validDoc,
            charter: { ...validDoc.charter, goals: [] },
        };
        const report = validateCnj(doc, 'authored');
        expect(report.valid).toBe(true);
    });
});
describe('validateCnj — recovered mode', () => {
    it('accepts 0.0.0-recovered as valid version', () => {
        const doc = {
            ...emptyDoc,
            charter: { ...emptyDoc.charter, title: 'Recovered', version: '0.0.0-recovered', goals: ['g'] },
        };
        const report = validateCnj(doc, 'recovered');
        const vers = report.violations.filter((v) => v.rule === 'charter-version');
        expect(vers.length).toBe(0);
    });
});
describe('validateCnj — from parsed source', () => {
    it('validates a parsed charter correctly', () => {
        const doc = parseDoc('(charter "P" :version "0.1.0" :goals ["do things"])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        expect(report.valid).toBe(true);
    });
    it('flags invalid version from parsed source', () => {
        const doc = parseDoc('(charter "P" :version "bad-version")');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const vers = report.violations.filter((v) => v.rule === 'charter-version');
        expect(vers.length).toBe(1);
    });
});
describe('validateCnj — intent topology', () => {
    const topologyDoc = (formSrc) => parseDoc(`(charter "P" :version "0.1.0" :goals ["g"]) ${formSrc}`);
    it('passes when :requires items all appear in :manifest', () => {
        const doc = topologyDoc('(conjure do-it :requires [feature-a] :manifest [feature-a])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const top = report.violations.filter((v) => v.rule.startsWith('intent-topology'));
        expect(top.length).toBe(0);
    });
    it('rule (a): errors when :requires item is missing from :manifest', () => {
        const doc = topologyDoc('(conjure do-it :requires [feature-a] :manifest [])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const vs = report.violations.filter((v) => v.rule === 'intent-topology-requires');
        expect(vs.length).toBe(1);
        expect(vs[0]?.message).toContain('feature-a');
    });
    it('rule (b): errors when :deferred item appears in :manifest (authored mode)', () => {
        const doc = topologyDoc('(conjure do-it :deferred [extra] :manifest [extra])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const vs = report.violations.filter((v) => v.rule === 'intent-topology-deferred');
        expect(vs.length).toBe(1);
    });
    it('rule (b): relaxed in :recovered mode', () => {
        const doc = topologyDoc('(conjure do-it :deferred [extra] :manifest [extra])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'recovered');
        const vs = report.violations.filter((v) => v.rule === 'intent-topology-deferred');
        expect(vs.length).toBe(0);
    });
    it('rule (c): errors when item is both :requires and :deferred (authored mode)', () => {
        const doc = topologyDoc('(conjure do-it :requires [feat] :deferred [feat] :manifest [feat])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const vs = report.violations.filter((v) => v.rule === 'intent-topology-conflict');
        expect(vs.length).toBe(1);
    });
    it('rule (c): relaxed in :recovered mode', () => {
        const doc = topologyDoc('(conjure do-it :requires [feat] :deferred [feat] :manifest [feat])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'recovered');
        const vs = report.violations.filter((v) => v.rule === 'intent-topology-conflict');
        expect(vs.length).toBe(0);
    });
    it('skips forms with no topology fields', () => {
        const doc = topologyDoc('(spell my-spell :purpose "something" :accepts {})');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const top = report.violations.filter((v) => v.rule.startsWith('intent-topology'));
        expect(top.length).toBe(0);
    });
});
// Minimal SymbolIndex builder for tests
const makeIndex = (known) => ({
    symbols: intoMap(known.map((s) => [s, { symbol: s, grimoire: 'core', namespace: '', synopsis: '', keyParams: [] }])),
    grimoires: intoMap([]),
});
describe('checkSymbolUsage — standalone', () => {
    it('returns no violations when all refs are known', () => {
        const index = makeIndex(['charter', 'spell', 'w/prototype']);
        const violations = checkSymbolUsage(['charter', 'spell', 'w/prototype'], index);
        expect(violations).toHaveLength(0);
    });
    it('returns a warning for each unknown symbol', () => {
        const index = makeIndex(['charter']);
        const violations = checkSymbolUsage(['charter', 'unknown-form', 'x/ghost'], index);
        expect(violations).toHaveLength(2);
        expect(violations.every((v) => v.rule === 'symbol-usage')).toBe(true);
        expect(violations.every((v) => v.severity === 'warning')).toBe(true);
        expect(violations.map((v) => v.message)).toEqual(expect.arrayContaining([
            expect.stringContaining('unknown-form'),
            expect.stringContaining('x/ghost'),
        ]));
    });
    it('returns no violations for an empty ref list', () => {
        const index = makeIndex(['charter']);
        const violations = checkSymbolUsage([], index);
        expect(violations).toHaveLength(0);
    });
});
describe('validateCnj — with symbol index (options)', () => {
    it('skips symbol check when no options provided (backward compat)', () => {
        const report = validateCnj(validDoc, 'authored');
        const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
        expect(sym).toHaveLength(0);
    });
    it('skips symbol check when options.index is undefined', () => {
        const report = validateCnj(validDoc, 'authored', { symbolRefs: ['unknown-symbol'] });
        const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
        expect(sym).toHaveLength(0);
    });
    it('skips symbol check when options.symbolRefs is undefined', () => {
        const index = makeIndex(['charter']);
        const report = validateCnj(validDoc, 'authored', { index });
        const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
        expect(sym).toHaveLength(0);
    });
    it('includes symbol-usage warnings when index and symbolRefs provided', () => {
        const index = makeIndex(['charter']);
        const report = validateCnj(validDoc, 'authored', { index, symbolRefs: ['charter', 'x/ghost'] });
        const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
        expect(sym).toHaveLength(1);
        expect(sym[0]?.message).toContain('x/ghost');
    });
    it('document remains valid when symbol violations are warnings only', () => {
        const index = makeIndex([]);
        const report = validateCnj(validDoc, 'authored', { index, symbolRefs: ['x/ghost'] });
        expect(report.valid).toBe(true);
        const sym = report.violations.filter((v) => v.rule === 'symbol-usage');
        expect(sym).toHaveLength(1);
        expect(sym[0]?.severity).toBe('warning');
    });
});
describe('checkReferences — standalone', () => {
    it('returns no violations when all references exist', () => {
        const status = [
            { ref: 'other.cnj', exists: true },
            { ref: 'sibling.cnj', exists: true },
        ];
        expect(checkReferences(status)).toHaveLength(0);
    });
    it('returns an error for each reference that does not exist', () => {
        const status = [
            { ref: 'found.cnj', exists: true },
            { ref: 'missing.cnj', exists: false },
            { ref: 'also-gone.cnj', exists: false },
        ];
        const violations = checkReferences(status);
        expect(violations).toHaveLength(2);
        expect(violations.every((v) => v.rule === 'references-resolve')).toBe(true);
        expect(violations.every((v) => v.severity === 'error')).toBe(true);
        expect(violations.map((v) => v.message)).toEqual(expect.arrayContaining([
            expect.stringContaining('missing.cnj'),
            expect.stringContaining('also-gone.cnj'),
        ]));
    });
    it('returns no violations for an empty status list', () => {
        expect(checkReferences([])).toHaveLength(0);
    });
});
describe('validateCnj — with referencesStatus (options)', () => {
    it('skips references check when no options provided (backward compat)', () => {
        const report = validateCnj(validDoc, 'authored');
        const refs = report.violations.filter((v) => v.rule === 'references-resolve');
        expect(refs).toHaveLength(0);
    });
    it('skips references check when referencesStatus is absent', () => {
        const index = makeIndex(['charter']);
        const report = validateCnj(validDoc, 'authored', { index });
        const refs = report.violations.filter((v) => v.rule === 'references-resolve');
        expect(refs).toHaveLength(0);
    });
    it('runs references check when referencesStatus is provided', () => {
        const referencesStatus = [{ ref: 'missing.cnj', exists: false }];
        const report = validateCnj(validDoc, 'authored', { referencesStatus });
        const refs = report.violations.filter((v) => v.rule === 'references-resolve');
        expect(refs).toHaveLength(1);
        expect(refs[0]?.severity).toBe('error');
        expect(refs[0]?.message).toContain('missing.cnj');
    });
    it('document is invalid when a broken reference produces an error', () => {
        const referencesStatus = [{ ref: 'gone.cnj', exists: false }];
        const report = validateCnj(validDoc, 'authored', { referencesStatus });
        expect(report.valid).toBe(false);
    });
    it('document stays valid when all references exist', () => {
        const referencesStatus = [{ ref: 'present.cnj', exists: true }];
        const report = validateCnj(validDoc, 'authored', { referencesStatus });
        const refs = report.violations.filter((v) => v.rule === 'references-resolve');
        expect(refs).toHaveLength(0);
        expect(report.valid).toBe(true);
    });
});
// ── Helpers for convention tests ──────────────────────────────────────────────
const BASE = `(charter "P" :version "0.1.0" :goals ["g"])`;
const withDecisions = (decisions) => parseDoc(`(charter "P" :version "0.1.0" :goals ["g"] :decisions [${decisions}])`);
const withTargets = (targets) => parseDoc(`${BASE} ${targets}`);
const d = (date, text) => `{:date "${date}" :decision "${text}"}`;
// ── lintConventions — decisions ───────────────────────────────────────────────
describe('lintConventions — decisions entry shape', () => {
    it('no violations for a well-formed decisions list', () => {
        const doc = withDecisions(`${d('2026-06-01', 'first')} ${d('2026-06-09', 'second')}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
        expect(v).toHaveLength(0);
    });
    it('warns when :decision value is missing', () => {
        const doc = withDecisions(`{:date "2026-06-09"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
        expect(v).toHaveLength(1);
        expect(v[0]?.severity).toBe('warning');
        expect(v[0]?.message).toContain(':decision');
    });
    it('warns when :date value is missing', () => {
        const doc = withDecisions(`{:decision "some text"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-entry-shape');
        expect(v).toHaveLength(1);
        expect(v[0]?.message).toContain(':date');
    });
    it('no violations for an empty decisions list', () => {
        const doc = withDecisions('');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule.startsWith('decisions'));
        expect(v).toHaveLength(0);
    });
});
describe('lintConventions — decisions date format', () => {
    it('no violations for correctly-formatted dates', () => {
        const doc = withDecisions(d('2026-06-09', 'text'));
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-date-format');
        expect(v).toHaveLength(0);
    });
    it('warns for a date that is not YYYY-MM-DD', () => {
        const doc = withDecisions(`{:date "June 9" :decision "text"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-date-format');
        expect(v).toHaveLength(1);
        expect(v[0]?.severity).toBe('warning');
        expect(v[0]?.message).toContain('June 9');
    });
});
describe('lintConventions — decisions chronological order', () => {
    it('no violations when dates are in order', () => {
        const doc = withDecisions(`${d('2026-06-01', 'a')} ${d('2026-06-05', 'b')} ${d('2026-06-09', 'c')}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
        expect(v).toHaveLength(0);
    });
    it('no violations when dates are equal (same-day decisions)', () => {
        const doc = withDecisions(`${d('2026-06-09', 'first')} ${d('2026-06-09', 'second')}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
        expect(v).toHaveLength(0);
    });
    it('warns when a later entry has an earlier date', () => {
        const doc = withDecisions(`${d('2026-06-09', 'later')} ${d('2026-06-01', 'earlier')}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'decisions-chronological-order');
        expect(v).toHaveLength(1);
        expect(v[0]?.severity).toBe('warning');
        expect(v[0]?.message).toContain('2026-06-01');
        expect(v[0]?.message).toContain('2026-06-09');
    });
});
// ── lintConventions — targets ─────────────────────────────────────────────────
describe('lintConventions — target language', () => {
    it('no violations when all targets declare :language', () => {
        const doc = withTargets('(target :my-target :language :typescript :produces [:lib])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
        expect(v).toHaveLength(0);
    });
    it('warns when a target has no :language', () => {
        const doc = withTargets('(target :my-target :produces [:lib])');
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
        expect(v).toHaveLength(1);
        expect(v[0]?.severity).toBe('warning');
    });
    it('no violations when there are no targets', () => {
        const doc = parseDoc(BASE);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const v = lintConventions(doc).filter((x) => x.rule === 'target-has-language');
        expect(v).toHaveLength(0);
    });
});
// ── validateCnj — conventions integrated ─────────────────────────────────────
describe('validateCnj — lint_conventions integrated', () => {
    it('convention warnings appear in violations', () => {
        const doc = withDecisions(`{:date "June 9" :decision "bad date"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        const conv = report.violations.filter((v) => v.rule === 'decisions-date-format');
        expect(conv).toHaveLength(1);
        expect(conv[0]?.severity).toBe('warning');
    });
    it('document stays valid when only convention warnings are present', () => {
        const doc = withDecisions(`{:date "bad-date" :decision "text"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        expect(report.valid).toBe(true);
    });
    it('strict mode fails on convention warnings', () => {
        // Use the tool-layer strict flag test — here just confirm warnings appear
        const doc = withDecisions(`{:date "bad" :decision "text"}`);
        expect(doc).toBeDefined();
        if (doc === undefined)
            return;
        const report = validateCnj(doc, 'authored');
        expect(report.violations.some((v) => v.severity === 'warning')).toBe(true);
    });
});
//# sourceMappingURL=validation.spec.js.map