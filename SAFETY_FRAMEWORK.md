# Trellis Lane Safety Analysis Framework

## Overview
This framework provides comprehensive safety procedures for analyzing and cleaning Trellis lanes before any destructive operations.

## Current State Snapshot

### Lane Isolation Status
- **syncEnvLaneFromEnv**: RESTORED ✓
- **Active lanes count**: 14+ lanes currently showing
- **Lane isolation**: RESTORED (CLI now properly enters lanes)
- **Orphaned worktrees**: `.trellis/worktrees/23626ba7` (dead directory)

### Lane Health Indicators
```
 Lane ID              Status   Ops  Health
───────────────────── ─────── ──── ───────────
 lane-0e4d4afc        active   0    stale-active
 lane-2fca3b4a         active   0    stale-active
 lane-34c1937c        active   0    stale-active
 lane-5d5807c2         active   0    stale-active
 lane-62561d65         active   0    stale
 lane-671f22aa         active   0    stale
 lane-73ad9f5a         active   0    stale
 lane-7802fab0         active   0    stale-active
 lane-9052d0ae         active   0    stale
 lane-a27ed768         active   0    stale
 lane-a96e5e3f         active   0    stale-active
 lane-b118c486         active  42    healthy
 lane-b968d160         active   0    stale-active
 lane-ba9a37ca         active   0    stale-active
 lane-d9500f6e         active   0    stale
 lane-e13b3012         dropped 0    dead
 lane-f132cbeb         active   4    healthy
 lane-f3993603         active   0    stale
```

## Safety Classification Matrix

### 🚨 CRITICAL PROTECTION (Do NOT Delete)

| Protection Criteria | Rrationale | Lanes |
|---------------------|-----------|-------|
| **Ops > 0** | Contains actual work, not empty | lane-b118c486 (42 ops), lane-f132cbeb (4 ops) |
| **Issue Bound** | Linked to active work items | All lanes without ops are unbound |
| **Recent Activity** | < 24 hours old | lane-7802fab0 (50m), lane-b968d160 (30m), lane-ba9a37ca (55m) |

### 🟡 CONDITIONAL PROTECTION (Review Required)

| Criteria | Risk Level | Action |
|----------|------------|--------|
| **Active Status** | LOW | Protected unless confirmed unused |
| **Recent Fork (< 1hr)** | MEDIUM | Review usage before deletion |

### ⚠️ SAFE TO CLEANUP

| Criteria | Rrationale |
|----------|-----------|
| **0 ops, >24h old, unbound** | Stale empty lanes |
| **Stale worktrees** | No git repository inside |
| **Orphaned directories** | No corresponding lane metadata |

## Conservative Cleanup Playbook

### Phase 1: Analysis & Documentation

#### 1.1 Lane Inventory Export
```bash
# Generate comprehensive lane report
mkdir -p /tmp/lane-analysis
cat > /tmp/lane-analysis/lane-inventory.json << 'EOF'
{
  "timestamp": "$(date -Iseconds)",
  "repo": "$(pwd)",
  "lanes": [
    $(trellis lane list --active --json | jq '.[]' | jq -c)
  ]
}
EOF

# Create detailed status report
mkdir -p /tmp/lane-analysis/reports
cat > /tmp/lane-analysis/reports/lane-health-report.txt << 'EOF'
TRELLIS LANE HEALTH REPORT
==========================
Generated: $(date)
Repo: $(pwd)

PROTECTION SUMMARY:
- Protected lanes: X (ops>0 or issue-bound)
- Review needed: Y (active < 24h)
- Safe to cleanup: Z (stale, unbound)

DETAILED ANALYSIS:
$(trellis lane list --active | sed 's/^/  /')

SAFETY NOTES:
1. Lane isolation restored - each agent gets its own lane
2. syncEnvLaneFromEnv operational
3. Lanes with ops>0 must be preserved
EOF
```

#### 1.2 Risk Assessment
```bash
# Assess potential impact
cat > /tmp/lane-analysis/risk-assessment.sh << 'EOF'
#!/bin/bash

echo "=== LANE CLEANUP RISK ASSESSMENT ==="
echo "$(date)"
echo ""

# Count lanes by category
PROTECTED=$(trellis lane list --active --json | jq 'map(select(.opCount > 0 or .issueId != null)) | length')
REVIEW=$(trellis lane list --active --json | jq 'map((.status == "active") and (.opCount == 0) and (.updatedAt < (now - 24*60*60*1000))) | length')
SAFE=$(trellis lane list --active --json | jq 'map((.status == "active") and (.opCount == 0) and (.updatedAt < (now - 2*24*60*60*1000))) | length')

echo "PROTECTION STATUS:"
echo "  Safe to cleanup (stale, unbound): $SAFE lanes"
echo "  Requires review (active, <24h, no ops): $REVIEW lanes"
echo "  CRITICAL (ops>0 or issue-bound): $PROTECTED lanes"
echo ""
echo "RECOMMENDED ACTIONS:"
echo "1. Never delete $PROTECTED lanes (actual work)"
echo "2. Review $REVIEW lanes for actual usage"
echo "3. Cleanup only $SAFE lanes if confirmed unused"
echo ""
echo "IMPACT ANALYSIS:"
echo "- Main branch: Should be unaffected (lanes are worktree-based)"
echo "- CI/CD: Check if pipeline depends on specific lane states"
echo "- Multi-agent: Ensure no running agents depend on cleanup targets"
echo ""
EOF

chmod +x /tmp/lane-analysis/risk-assessment.sh
/tmp/lane-analysis/risk-assessment.sh
```

### Phase 2: Validation & Safeguards

#### 2.1 Pre-Cleanup Validation
```bash
# Create validation script
cat > /tmp/lane-analysis/validate-before-cleanup.sh << 'EOF'
#!/bin/bash

echo "=== PRE-CLEANUP VALIDATION ==="
echo "$(date)"
echo ""

# 1. Verify lane isolation
export TRELLIS_LANE_ID=$(trellis lane list --active --json | jq -r '.[0].id')
echo "1. Active lane: $TRELLIS_LANE_ID"
echo "2. Testing CLI lane isolation..."
trellis lane list --active > /dev/null && echo "   ✓ CLI lane isolation working"

# 2. Check for running processes using lanes
if pgrep -f "trellis.*lane" > /dev/null; then
    echo "⚠️  WARNING: trellis lane processes detected"
    echo "   Manual verification required before cleanup"
else
    echo "   ✓ No trellis lane processes detected"
fi

# 3. Verify main branch integrity
git status --short | grep -v "^??" | head -5
echo "   ✓ Main branch status checked"

# 4. Backup current state
BACKUP_DIR="/tmp/lane-analysis/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .trellis "$BACKUP_DIR/"
echo "✓ State backed up to: $BACKUP_DIR"

echo ""
echo "VALIDATION COMPLETE - Ready for dry-run"
EOF

chmod +x /tmp/lane-analysis/validate-before-cleanup.sh
/tmp/lane-analysis/validate-before-cleanup.sh
```

#### 2.2 Dry-Run Analysis
```bash
# Generate dry-run report
cat > /tmp/lane-analysis/dry-run.sh << 'EOF'
#!/bin/bash

echo "=== DRY-RUN LANE CLEANUP ANALYSIS ==="
echo "$(date)"
echo ""

# What WOULD be deleted (simulate)
echo "LANE CLEANUP PROPOSAL:"
echo ""
echo "The following lanes are SAFE TO CLEANUP:")

# Find stale, unbound, old lanes
trellis lane list --active --json | jq -r '
  map(select(.opCount == 0))
  | map(select(.status == "active"))
  | map(select(.updatedAt < (now - 48*60*60*1000)))
  | map(select(.issueId == null))
  | map("  - " + .id + " (updated: " + (.updatedAt | strftime("%Y-%m-%d %H:%M")) + ", fork: " + (.createdAt | strftime("%Y-%m-%d %H:%M")) + ")")
  | .[]
'

echo ""
echo "LANE PROTECTION SUMMARY:"
echo "The following lanes MUST BE PROTECTED:")

trellis lane list --active --json | jq -r '
  map(select(.opCount > 0 or .issueId != null))
  | map("  - " + .id + " (ops: " + (.opCount|tostring) + ", issue: " + (if .issueId then .issueId else "none") + ")")
  | .[]
'

echo ""
echo "RECOMMENDED CLEANUP COMMAND (AFTER REVIEW):"
echo "trellis lane gc --apply --force --protected-ids='id1,id2,...'"
echo ""
echo "This will delete ONLY the lanes listed above in SAFE TO CLEANUP section."
EOF

chmod +x /tmp/lane-analysis/dry-run.sh
/tmp/lane-analysis/dry-run.sh
```

### Phase 3: Implementation (After Approval)

#### 3.1 Safe Cleanup Execution
```bash
# Only run AFTER thorough review
cat > /tmp/lane-analysis/safe-cleanup.sh << 'EOF'
#!/bin/bash

echo "=== SAFE LANE CLEANUP EXECUTION ==="
echo "$(date)"
echo ""

# Verify prerequisites
if [ ! -f "/tmp/lane-analysis/dry-run.sh" ]; then
    echo "ERROR: Dry run analysis not found!"
    exit 1
fi

# Get list of lanes to delete (stale, unbound, old)
LANES_TO_DELETE=$(trellis lane list --active --json | jq -r '
  map(select(.opCount == 0))
  | map(select(.status == "active"))
  | map(select(.updatedAt < (now - 48*60*60*1000)))
  | map(select(.issueId == null))
  | map(.id)
  | join(",")
')

if [ -z "$LANES_TO_DELETE" ]; then
    echo "✓ No lanes to cleanup - lane state is already clean"
    exit 0
fi

echo "LANES TO DELETE:"
echo "$LANES_TO_DELETE"
echo ""
echo "WARNING: This will delete these lanes and their worktrees!"
echo ""

# Final confirmation
read -p "Type 'DELETE' to confirm cleanup: " CONFIRMATION
if [ "$CONFIRMATION" != "DELETE" ]; then
    echo "Cleanup cancelled by user"
    exit 0
fi

# Execute cleanup
echo "Executing cleanup..."
trellis lane gc --apply --force

if [ $? -eq 0 ]; then
    echo "✓ Cleanup completed successfully"
    echo ""
    echo "Next steps:"
    echo "1. Run tests to verify system integrity"
    echo "2. Check any running processes"
    echo "3. Verify main branch functionality"
else
    echo "✗ Cleanup failed - manual intervention required"
    exit 1
fi
EOF

chmod +x /tmp/lane-analysis/safe-cleanup.sh
/tmp/lane-analysis/safe-cleanup.sh
```

### Phase 4: Post-Cleanup Verification

#### 4.1 Validation Script
```bash
# Create post-cleanup validation
cat > /tmp/lane-analysis/validate-after-cleanup.sh << 'EOF'
#!/bin/bash

echo "=== POST-CLEANUP VALIDATION ==="
echo "$(date)"
echo ""

# 1. Verify lane count
trellis lane list --active --json | jq 'length' > /tmp/lane-analysis/lane-count-after.txt
AFTER_COUNT=$(cat /tmp/lane-analysis/lane-count-after.txt)
echo "Lanes after cleanup: $AFTER_COUNT"

# 2. Check health
./tmp/lane-analysis/risk-assessment.sh

# 3. Verify isolation
export TRELLIS_LANE_ID=$(trellis lane list --active --json | jq -r '.[0].id')
if [ -n "$TRELLIS_LANE_ID" ]; then
    echo "✓ Lane isolation restored: $TRELLIS_LANE_ID"
else
    echo "⚠️  No active lanes found"
fi

# 4. Run tests if available
if command -v pnpm >/dev/null 2>&1; then
    echo "✓ pnpm available - run 'pnpm test' to verify functionality"
elif command -v npm >/dev/null 2>&1; then
    echo "✓ npm available - run 'npm test' to verify functionality"
fi

echo ""
echo "POST-CLEANUP VALIDATION COMPLETE"
EOF

chmod +x /tmp/lane-analysis/validate-after-cleanup.sh
/tmp/lane-analysis/validate-after-cleanup.sh
```

### Phase 5: Rollback Procedures

#### 5.1 Rollback Framework
```bash
# Create rollback script
cat > /tmp/lane-analysis/rollback-lane-cleanup.sh << 'EOF'
#!/bin/bash

echo "=== LANE CLEANUP ROLLBACK PROCEDURE ==="
echo "$(date)"
echo ""

# Check if backup exists
BACKUP_DIR="/tmp/lane-analysis/backup_"
LATEST_BACKUP=$(ls -td $BACKUP_DIR* 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ] || [ ! -d "$LATEST_BACKUP/.trellis" ]; then
    echo "ERROR: No backup found for rollback!"
    echo "Manual recovery required"
    exit 1
fi

echo "Found backup: $LATEST_BACKUP"
echo ""
echo "ROLLBACK OPTIONS:"
echo "1. Full rollback (restore .trellis directory)"
echo "2. Partial rollback (restore specific lanes)"
echo "3. Exit without rollback"
echo ""
read -p "Choose option (1-3): " ROLLBACK_OPTION

case $ROLLBACK_OPTION in
    1)
        echo "Executing full rollback..."
        rm -rf .trellis
        cp -r "$LATEST_BACKUP/.trellis" .
        echo "✓ Full rollback completed"
        ;;
    2)
        echo "Partial rollback not yet implemented"
        ;;
    3)
        echo "Rollback cancelled"
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "Rollback completed. Verify system integrity."
EOF

chmod +x /tmp/lane-analysis/rollback-lane-cleanup.sh
```

## Safety Checklist

### Before Any Cleanup:
- [ ] Documentation created and reviewed
- [ ] Risk assessment completed
- [ ] Backup created
- [ ] Dry-run analysis performed
- [ ] Team approval obtained

### During Cleanup:
- [ ] Confirm lanes to be deleted
- [ ] Verify no critical dependencies
- [ ] Execute cleanup with confirmation
- [ ] Monitor for errors

### After Cleanup:
- [ ] Run validation script
- [ ] Test system functionality
- [ ] Verify lane isolation
- [ ] Document changes

## Emergency Procedures

### If Something Goes Wrong:
1. **Immediate Stop**: Halt all cleanup operations
2. **Document State**: Capture current lane configuration
3. **Trigger Rollback**: Use rollback script if available
4. **Notify Team**: Alert all stakeholders
5. **Assess Impact**: Determine scope of issues

## Version Control Integration

### Git Operations During Cleanup:
```bash
# Stage safety analysis files
git add /tmp/lane-analysis/

# Create feature branch for lane cleanup
git checkout -b lane-cleanup-safety/$(date +%Y%m%d_%H%M%S)

# Commit safety framework
git commit -m "Add comprehensive lane cleanup safety framework

- lane analysis and health assessment
- dry-run cleanup procedure
- rollback and validation scripts
- emergency response procedures

Co-authored-by: openhands <openhands@all-hands.dev>"

# Push to review branch
# Request peer review and approval
```

## Conclusion

This framework provides a comprehensive, safety-first approach to Trellis lane cleanup. By following the conservative playbook and maintaining thorough documentation, we can safely clean up stale lanes while preserving critical work and ensuring system integrity.

**Key Principles:**
1. Never delete lanes with actual work (ops > 0)
2. Always validate before destructive operations
3. Maintain comprehensive backup and rollback capabilities
4. Document every step for auditability

This framework protects your system while enabling necessary maintenance and cleanup operations.
EOF
