from pathlib import Path
import re

# Parse all tables defined in the Supabase migrations.
used_tables = None

base = Path('supabase/migrations')
create_re = re.compile(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(?:"([^"]+)"|([a-zA-Z0-9_]+))', re.I)

# Extract columns from a block of SQL column definitions.
def split_columns(body: str):
    cols = []
    current = ''
    depth = 0
    i = 0
    while i < len(body):
        c = body[i]
        if c == '(':
            depth += 1
            current += c
        elif c == ')':
            depth = max(depth - 1, 0)
            current += c
        elif c == ',' and depth == 0:
            if current.strip():
                cols.append(current.strip())
            current = ''
        else:
            current += c
        i += 1
    if current.strip():
        cols.append(current.strip())
    return cols


def normalize_sql_type(sql: str):
    sql = sql.strip()
    sql = re.sub(r'\s*DEFAULT\s+.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*NOT\s+NULL.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*NULL.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*PRIMARY\s+KEY.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*UNIQUE.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*REFERENCES\s+.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*CHECK\s*\(.*$', '', sql, flags=re.I)
    sql = re.sub(r'\s*COLLATE\s+[^\s]+', '', sql, flags=re.I)
    sql = re.sub(r'\s*::[A-Za-z0-9_\[\]]+', '', sql)
    return sql.strip()


def map_type(sql_type: str):
    s = sql_type.lower().strip()
    if s.endswith('[]'):
        inner = map_type(s[:-2].strip())
        return f'{inner}[]'
    if s.startswith('varchar') or s.startswith('character varying') or s.startswith('text') or s.startswith('citext') or s.startswith('inet') or s.startswith('uuid') or s.startswith('date') or s.startswith('time') or s.startswith('timestamp') or s.startswith('timestamptz') or s.startswith('json') or s.startswith('jsonb') or s.startswith('character'):
        if s.startswith('json') or s.startswith('jsonb'):
            return 'Json'
        return 'string'
    if s.startswith('boolean') or s.startswith('bool'):
        return 'boolean'
    if s.startswith('integer') or s.startswith('int') or s.startswith('smallint') or s.startswith('bigint') or s.startswith('serial') or s.startswith('numeric') or s.startswith('decimal') or s.startswith('real') or s.startswith('double precision') or s.startswith('money') or s.startswith('float'):
        return 'number'
    return 'Json'

schema = {}
for path in sorted(base.glob('*.sql')):
    text = path.read_text(encoding='utf-8')
    lines = []
    collecting = False
    table_name = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.startswith('--'):
            continue
        if not collecting:
            m = create_re.match(line)
            if m:
                table_name = m.group(1) or m.group(2)
                collecting = True
                body = line[line.index('(')+1:] if '(' in line else ''
                lines = [body]
            continue
        # collecting lines
        if line.endswith(');'):
            lines.append(line[:-2])
            body = ' '.join(lines)
            cols = split_columns(body)
            parsed = []
            for col_def in cols:
                col_def = re.sub(r'--.*', '', col_def).strip()
                if not col_def:
                    continue
                if re.match(r'^(PRIMARY|UNIQUE|CONSTRAINT|CHECK|FOREIGN|ALTER|CREATE)\b', col_def, re.I):
                    continue
                parts = col_def.split()
                if len(parts) < 2:
                    continue
                col_name = parts[0]
                sql_type = normalize_sql_type(' '.join(parts[1:]))
                if sql_type == '':
                    continue
                parsed.append((col_name, map_type(sql_type)))
            schema[table_name] = parsed
            collecting = False
            table_name = None
            lines = []
        else:
            lines.append(line)

    # Parse ALTER TABLE ADD COLUMN statements for additional columns
    alter_re = re.compile(
        r'ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(?:"([^"]+)"|([A-Za-z0-9_]+))\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|([A-Za-z0-9_]+))\s+(.+?);',
        re.I | re.S,
    )
    for m in alter_re.finditer(text):
        table_name = m.group(1) or m.group(2)
        col_name = m.group(3) or m.group(4)
        col_def = m.group(5).strip()
        col_def = re.sub(r'--.*', '', col_def).strip()
        if not col_def:
            continue
        parts = col_def.split()
        if len(parts) < 1:
            continue
        sql_type = normalize_sql_type(' '.join(parts))
        if sql_type == '':
            continue
        if table_name not in schema:
            schema[table_name] = []
        if col_name not in [c for c, _ in schema[table_name]]:
            schema[table_name].append((col_name, map_type(sql_type)))

# Print summary for parsed tables and generate a typed Database interface.
for table in sorted(schema):
    print('TABLE', table)
    cols = schema.get(table)
    for col, t in cols:
        print('  ', col, t)
    print()

# Write a fallback supabase types file for the app.
output_lines = [
    'export type Json =',
    '  | string',
    '  | number',
    '  | boolean',
    '  | null',
    '  | { [key: string]: Json }',
    '  | Json[];',
    '',
    'export interface Database {',
    '  public: {',
    '    Tables: {',
]
for table in sorted(schema):
    output_lines.append(f'      {table}: {{')
    output_lines.append('        Row: {')
    for col, t in schema[table]:
        key = col if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', col) else f"'{col}'"
        output_lines.append(f'          {key}: {t};')
    output_lines.append('        };')
    output_lines.append('        Insert: {')
    for col, t in schema[table]:
        key = col if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', col) else f"'{col}'"
        output_lines.append(f'          {key}?: {t};')
    output_lines.append('        };')
    output_lines.append('        Update: {')
    for col, t in schema[table]:
        key = col if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', col) else f"'{col}'"
        output_lines.append(f'          {key}?: {t};')
    output_lines.append('        };')
    output_lines.append('      };')
output_lines.extend([
    '    };',
    '    Views: Record<string, never>;',
    '    Functions: Record<string, never>;',
    '    Enums: Record<string, never>;',
    '  };',
    '}',
])
Path('src/integrations/supabase/types.ts').write_text('\n'.join(output_lines) + '\n', encoding='utf-8')
print(f'WROTE {len(output_lines)} lines to src/integrations/supabase/types.ts')