import path from 'path';
import ts from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy';

const OUT_DIR = path.resolve('build');

export default {
  input: 'src/index.ts',
  output: { dir: OUT_DIR, format: 'iife' },
  plugins: [
    ts(),
    copy({
      targets: [
        { src: 'src/*.{html,css}', dest: OUT_DIR },
      ],
    }),
  ],
};
