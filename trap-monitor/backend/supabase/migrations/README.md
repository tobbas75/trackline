# Trap Monitor — Migration Notes

## Numbering Gap (003/004 missing)

Migrations 003 and 004 were removed. They contained org_members RLS policies
that caused recursive policy conflicts with WildTrack's shared tables.

Migration 005 is the hotfix that cleaned up the damage:
- Dropped the bad policies and functions (`trap_is_org_member`, `trap_has_org_role`)
- Restored canonical `org_members` policies compatible with all apps

Do NOT renumber migrations or attempt to fill the gap. The sequence 001 → 002 → 005
is intentional and correct.

## Migration Summary

| File | Purpose |
|------|---------|
| 001_initial_schema.sql | Core tables: units, events, commands, notifications. Broad RLS (superseded by 002). |
| 002_organizations_and_multitenancy.sql | Adds org_id to units, creates trap_can_* functions, replaces RLS with org-scoped policies. |
| 005_shared_db_org_members_hotfix.sql | Removes bad org_members policies from deleted 003/004, restores canonical shared policies. |
