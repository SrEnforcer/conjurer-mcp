import tsfppApi from '@tsfpp/eslint-config/api';

// The api profile makes no-console an error, which enforces the stdio rule that the
// server never writes to stdout; it also adds the no-unsafe-* boundary checks.
export default [...tsfppApi];
