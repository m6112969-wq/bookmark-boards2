import { cpSync, mkdirSync } from 'node:fs';
// Explicit allowlist: never publish Git metadata, tests, rules or credential files.
mkdirSync('public', { recursive: true });
cpSync('index.html', 'public/index.html');
cpSync('assets', 'public/assets', { recursive: true });
