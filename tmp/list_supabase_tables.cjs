const fs = require('fs');
const glob = require('glob');
const re = /\.from\(['\"]([a-zA-Z0-9_]+)['\"]\)/g;
const files = glob.sync('src/**/*.{ts,tsx}');
const names = new Set();
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(text))) {
    names.add(m[1]);
  }
}
console.log(JSON.stringify([...names].sort(), null, 2));
