/**
 * Package Codebase ZIP for Submission
 * Creates code.zip packaging code/, src/, evaluation/, prompts/, scripts/, tests/, and root configs.
 * Strictly excludes dataset/, node_modules/, __pycache__, .venv, and any nested zip archives.
 */
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function packageCodeZip() {
  const repoRoot = process.cwd();
  console.log('Packaging code.zip for submission...');

  const zip = new JSZip();

  const addDirToZip = (dirPath: string, zipFolder: JSZip) => {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (
        item === 'node_modules' ||
        item === 'dist' ||
        item === '.git' ||
        item === '__pycache__' ||
        item === '.venv' ||
        item.endsWith('.pyc') ||
        item.endsWith('.DS_Store') ||
        item.endsWith('.zip')
      ) {
        continue;
      }
      const full = path.join(dirPath, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const sub = zipFolder.folder(item);
        if (sub) addDirToZip(full, sub);
      } else {
        zipFolder.file(item, fs.readFileSync(full));
      }
    }
  };

  addDirToZip(path.join(repoRoot, 'code'), zip.folder('code')!);
  addDirToZip(path.join(repoRoot, 'src'), zip.folder('src')!);
  addDirToZip(path.join(repoRoot, 'evaluation'), zip.folder('evaluation')!);
  addDirToZip(path.join(repoRoot, 'prompts'), zip.folder('prompts')!);
  addDirToZip(path.join(repoRoot, 'scripts'), zip.folder('scripts')!);
  addDirToZip(path.join(repoRoot, 'tests'), zip.folder('tests')!);

  const rootFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'README.md',
    'metadata.json',
    'server.ts',
  ];

  for (const rf of rootFiles) {
    const p = path.join(repoRoot, rf);
    if (fs.existsSync(p)) {
      zip.file(rf, fs.readFileSync(p));
    }
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const zipPath = path.join(repoRoot, 'code.zip');
  fs.writeFileSync(zipPath, zipBuffer);
  console.log(`Successfully created ${zipPath} (${zipBuffer.length.toLocaleString()} bytes)`);

  // Verification
  const verifyZip = await JSZip.loadAsync(zipBuffer);
  const fileNames = Object.keys(verifyZip.files);
  console.log(`Verified code.zip contains ${fileNames.length} files.`);

  const requiredInCode = [
    'README.md',
    'code/main.py',
    'code/evaluation/main.py',
    'code/evaluation/evaluation_report.md',
    'code/evaluation/usage_report.md',
  ];

  for (const req of requiredInCode) {
    if (fileNames.includes(req)) {
      console.log(`  ✓ ${req} present`);
    } else {
      console.error(`  ✗ MISSING: ${req}`);
      process.exit(1);
    }
  }

  const forbiddenPrefixes = ['dataset/', 'node_modules/', '.git/'];
  for (const fn of fileNames) {
    for (const forb of forbiddenPrefixes) {
      if (fn.startsWith(forb)) {
        console.error(`  ✗ FORBIDDEN ITEM FOUND: ${fn}`);
        process.exit(1);
      }
    }
    if (fn.endsWith('.zip')) {
      console.error(`  ✗ NESTED ZIP FOUND: ${fn}`);
      process.exit(1);
    }
  }

  console.log('ALL VERIFICATION CHECKS PASSED FOR code.zip!');
}

packageCodeZip().catch((err) => {
  console.error('Packaging error:', err);
  process.exit(1);
});
