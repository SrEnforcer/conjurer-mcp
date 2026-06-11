/**
 * plugin-compat.ts
 *
 * Adapter boundary for third-party ESLint plugin type coercion.
 *
 * Problem: ESLint plugin packages frequently ship TypeScript types that lag
 * behind the current @eslint/core `Plugin` interface. The structural mismatch
 * (e.g. `null` in `parser` where `string | undefined` is expected, or `flat`
 * keys in `configs` that don't satisfy the index signature) causes TS2322
 * errors at plugin registration sites in flat config objects.
 *
 * Solution: Isolate the necessary `as` cast here, at this single adapter
 * boundary. Every callsite in base.ts / react.ts / api.ts is auditable by
 * grepping for `coercePlugin`.
 *
 * DEVIATION(1.6): `as` cast is intentional and confined to this module.
 * Justification: third-party type incompatibility at an adapter boundary;
 * no runtime effect — this is a pure type-level coercion with zero behavior.
 * Reviewed and approved per TSF++ deviation procedure.
 */
import type { ESLint } from 'eslint';
/**
 * Coerces a third-party ESLint plugin object to the canonical `ESLint.Plugin`
 * type accepted by flat config `plugins` records.
 *
 * Use exclusively at plugin registration sites. Never use to silence unrelated
 * type errors.
 */
export declare const coercePlugin: (plugin: unknown) => ESLint.Plugin;
//# sourceMappingURL=plugin-compat.d.ts.map