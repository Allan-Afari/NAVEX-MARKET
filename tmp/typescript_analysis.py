#!/usr/bin/env python3
"""
Analyze TypeScript strict mode migration strategy.
- Find all `any` types
- Identify nullable types
- Prioritize files for migration
"""

import re
from pathlib import Path
from collections import defaultdict

# Find all .ts/.tsx files
src_dir = Path("src")
files = list(src_dir.rglob("*.tsx")) + list(src_dir.rglob("*.ts"))

# Analysis results
any_usage = defaultdict(int)
nullable_issues = defaultdict(int)
files_by_priority = []

print("\n" + "="*80)
print("TYPESCRIPT STRICT MODE MIGRATION ANALYSIS")
print("="*80)

# Scan files
for file in sorted(files):
    try:
        content = file.read_text(encoding='utf-8')
        
        # Count `any` usage
        any_count = len(re.findall(r'\bany\b', content))
        if any_count > 0:
            any_usage[str(file)] = any_count
        
        # Count potential null issues
        # Look for patterns like `.map(` or `.filter(` without null checks
        map_filter = len(re.findall(r'\??\.\s*(map|filter|forEach)\s*\(', content))
        
    except Exception as e:
        print(f"Error reading {file}: {e}")

# Sort by priority (most `any` types first)
sorted_any = sorted(any_usage.items(), key=lambda x: x[1], reverse=True)

print("\n📊 TOP 15 FILES WITH `any` USAGE (Highest Priority)")
print("-" * 80)
print(f"{'File':<50} {'Count':>8}")
print("-" * 80)

total_any = 0
for file, count in sorted_any[:15]:
    total_any += count
    # Make path relative for readability
    rel_path = file.replace(str(src_dir) + "\\", "").replace("\\", "/")
    print(f"{rel_path:<50} {count:>8}")

print("-" * 80)
print(f"{'TOTAL ANY TYPES (top 15)':<50} {total_any:>8}")
print(f"{'TOTAL ANY TYPES (all files)':<50} {sum(any_usage.values()):>8}")

print("\n\n🎯 MIGRATION STRATEGY")
print("-" * 80)
print("""
PHASE 1: PREPARE (this week)
  1. Enable strictNullChecks only (leave noImplicitAny: false)
     - This catches the most dangerous issues (null reference errors)
     - Run: npm run build
  
  2. Fix top 5 files with highest `any` count
     - DealRoomAnalytics.tsx (7 uses)
     - DealRoomDetail.tsx (6 uses)
     - etc.

PHASE 2: ENABLE NULLCHECKS (1 week)
  1. Fix all null-coalescing errors
  2. Add proper type guards
  3. Use `?.` operator for optional chains
  4. Test thoroughly

PHASE 3: ADD IMPLICIT ANY (2 weeks)
  1. Enable noImplicitAny: true
  2. Replace `any` with proper types
  3. Add interfaces for complex objects
  4. Use `unknown` when truly dynamic

PHASE 4: ADD TYPE SAFETY (1 week)
  1. Enable noUnusedLocals: true
  2. Enable noUnusedParameters: true
  3. Clean up dead code
""")

print("\n\n📋 QUICK WINS (Start Here)")
print("-" * 80)
print("""
1. Replace simple `any` with specific types:
   - `offer: any` → `offer: DealOffer`
   - `p: any` → `p: Participant`
   - `room: any` → `room: DealRoom`

2. Use utility types for filtered data:
   - `.map((item: any) => ...)` → `.map((item: YourType) => ...)`

3. Add interface definitions for returned data:
   - Create types/deals.ts with Deal, DealOffer, Participant interfaces
   - Import and use them everywhere

4. Add type guards:
   - `if (data && data.id) { ... }` instead of trusting null
""")

print("\n" + "="*80)
print("NEXT STEP: Run 'npm run build' with strictNullChecks enabled")
print("="*80 + "\n")
