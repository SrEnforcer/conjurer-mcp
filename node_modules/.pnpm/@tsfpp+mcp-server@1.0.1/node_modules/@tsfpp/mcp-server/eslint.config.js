import tsfpp from '@tsfpp/eslint-config'

export default [
	...tsfpp,
	{
		files: ['src/**/*.test.ts', 'tests/factories/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.test.json',
			},
		},
	},
]
