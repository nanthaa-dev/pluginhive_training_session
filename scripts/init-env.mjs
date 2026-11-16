import fs from 'node:fs';
import path from 'node:path';

const projects = [
  { name: 'root', directory: '.' },
  { name: 'shiphub-api', directory: 'shiphub-api' },
  { name: 'shiphub-web', directory: 'shiphub-web' }
];

for (const project of projects) {
  const examplePath = path.join(project.directory, '.env.example');
  const envPath = path.join(project.directory, '.env');

  if (!fs.existsSync(examplePath)) {
    console.log(`${project.name}: .env.example not found`);
    continue;
  }

  if (fs.existsSync(envPath)) {
    console.log(`${project.name}: .env already exists. Skipping.`);
    continue;
  }

  fs.copyFileSync(examplePath, envPath);
  console.log(`${project.name}: .env created.`);
}