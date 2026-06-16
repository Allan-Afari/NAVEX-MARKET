from pathlib import Path
import re

base = Path('supabase/migrations')
create_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\)\s*;', re.S | re.I)
cols_re = re.compile(r'\s*([a-zA-Z0-9_]+)\s+([^,\n]+)(?:,|\n)')
seen = {}
for path in sorted(base.glob('*.sql')):
    text = path.read_text(encoding='utf-8')
    for m in create_re.finditer(text):
        name = m.group(1)
        body = m.group(2)
        if name in seen:
            continue
        cols = []
        for cm in cols_re.finditer(body + '\n'):
            col = cm.group(1)
            rest = cm.group(2).strip()
            if col.lower() in ('primary', 'unique', 'constraint', 'check', 'foreign', 'alter', 'create'):
                continue
            cols.append((col, rest))
        seen[name] = cols

print(len(seen), 'tables')
for name in sorted(seen):
    print('TABLE', name)
    for col, rest in seen[name]:
        print('  ', col, rest)
