import { UserConfigExport } from 'vite';

export default <UserConfigExport>{
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
};
