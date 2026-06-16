from pathlib import Path
import re

root = Path('src')
from_tables = set()
for path in root.rglob('*.ts*'):
    text = path.read_text(encoding='utf-8')
    for m in re.finditer(r"supabase\.from\(\s*['\"]([a-zA-Z0-9_\-]+)['\"]", text):
        from_tables.add(m.group(1))
    for m in re.finditer(r"supabase\.storage\.from\(\s*['\"]([a-zA-Z0-9_\-]+)['\"]", text):
        # ignore storage bucket names from the DB schema comparison
        from_tables.discard(m.group(1))

text = Path('src/integrations/supabase/types.ts').read_text(encoding='utf-8')
schema_tables = set(re.findall(r'^\s*([a-zA-Z0-9_]+):\s*\{', text, re.MULTILINE))
schema_tables -= {'Row', 'Insert', 'Update', 'Tables', 'public'}

missing = sorted([t for t in from_tables if t not in schema_tables])
extra = sorted([t for t in schema_tables if t not in from_tables])

print('FROM tables count', len(from_tables))
print('SCHEMA tables count', len(schema_tables))
print('MISSING', missing)
print('EXTRA', extra[:50])
