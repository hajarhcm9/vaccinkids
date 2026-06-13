const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const scanRoots = ['app/src/main/java', 'app/src/main/res/layout', 'src/screens', 'src/services'];
const forbidden = [
  'ADMIN01',
  'INFIRM01',
  'CentresOujdaData',
  'configJours',
  'Centre de Santé Es-Salaam',
];
const findings = [];

function scan(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      scan(child);
      continue;
    }
    const content = fs.readFileSync(path.join(root, child), 'utf8');
    for (const value of forbidden) {
      if (content.includes(value)) findings.push(`${child}: contains ${JSON.stringify(value)}`);
    }
  }
}

scanRoots.forEach(scan);

if (findings.length) {
  console.error('Runtime fixture check failed:\n' + findings.join('\n'));
  process.exit(1);
}

console.log('Runtime fixture check passed');

