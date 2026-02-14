import { spawn } from 'child_process';

const child = spawn('npx', ['tsx', 'prisma/seed.ts'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Error executing seed:', err);
  process.exit(1);
});
