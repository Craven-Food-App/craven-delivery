import type { Config } from 'tailwindcss';
import path from 'node:path';
import rootConfig from '../../../tailwind.config';

const rootSrc = path.resolve(__dirname, '../../../src');

export default {
  ...rootConfig,
  content: [
    path.resolve(__dirname, './index.html'),
    path.resolve(__dirname, './src/**/*.{ts,tsx}'),
    path.join(rootSrc, '**/*.{ts,tsx}'),
  ],
} satisfies Config;
