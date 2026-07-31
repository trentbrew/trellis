# Trellis Peer System Documentation

**Status:** Current Implementation (Needs Formalization)  
**Date:** 2026-07-31  
**Related:** ADR 0032, Geodata Proposal, Identity System  

## Executive Summary

Trellis uses **locally-scoped peer handles** as social identifiers rather than global usernames. A `{peer}` in `{peer}/{repo}` references a person **within your social context**, not globally unique across all Trellis users.

This design aligns with Trellis's core principles:
- **Local-first**: Peers exist in `~/.trellis/peers.json` per machine
- **Socially-grounded**: References are within your known network
- **Context-aware**: You can have multiple peers with the same handle locally
- **Safe by design**: Cannot target unknown/rogue peers

## Core Concepts

### 1. Peer Handle = Social Identifier

```bash
# On Machine A (you know both Laurens):
trellis peer add lauren <sister-sprout-url>    # Your sister Alice
rellis peer add lauren <potato-sprout-url>   # Norwegian farmer Lars

# On Machine B (Lars knows only himself):
trellis peer add lauren <potato-sprout-url>   # Just Lars
```

**Result**: `lauren` resolves differently on each machine based on who you know.

### 2. Resolution Logic

```typescript
function resolvePeer(ref: string): PeerRecord | null {
  const peers = loadPeers();  // ~/.trellis/peers.json (local only)
  
  // Exact match by registered name
  const exact = peers[ref];
  if (exact) return exact;
  
  // Identity-based resolution (more flexible)
  for (const record of Object.values(peers)) {
    if (record.did === ref || record.entityId === ref) return record;
  }
  
  return null;  // No such peer in YOUR context
}
```

### 3. Project Reference Pattern

```bash
# {peer}/{repo} breakdown:
# {peer}  = person you know (from YOUR peers.json)
# {repo}  = project slug scoped under that person
# {repo}  = often matches project.name, always maps to repoId

# Examples:
#   - trentb/trellis-node    (your own project)
#   - alice/data-science     (project owned by Alice in your context)
#   - lauren/openstreetmap  (project from the Lauren you know)
```

## Current Implementation

### Files

- `src/vcs/peer-resolver.ts` - Core peer resolution logic
- `src/cli/clone-cli.ts` - `{peer}/{repo}` command handling
- `src/cli/remote-cli.ts` - Remote sprite URL configuration
- `~/.trellis/peers.json` - Local peer configuration (hidden file)

### Data Structure

```typescript
interface PeerRecord {
  did: string;                    // did:key identity
  entityId: string;               // identity:<did> (repo owner)
  publicKey: string;              // Ed25519 public key
  spriteUrls: string[];          // Sprite endpoints
  displayName?: string;           // Human-readable name
}

interface PeersFile {
  [peerName: string]: PeerRecord;
}
```

### CLI Commands

#### `trellis peer add`
```bash
# Register a person you know
# Maps: {peer} → {did} + {spriteUrls}
# Used by: project clone {peer}/{repo}

# Register with existing identity
$ trellis peer add trentb <https://trent.sprite.trellis.com>

# Register with new identity (interactive)
$ trellis peer add lauren <https://lauren.sprite.trellis.com> --did did:key:...
```

#### `trellis project clone {peer}/{repo}`
```bash
# Clone by identity, not URL
# Validates attestation before accepting
# Safe: cannot target unknown peers

$ trellis project clone trentb/trellis-node
```

#### `trellis peer list`
```bash
# Show all registered peers (local only)

$ trellis peer list
  trentb  · https://trent.sprite.trellis.com (identity:did:key:...)
  alice   · https://alice.sprite.trellis.com (identity:did:key:...)
```

## Key Properties

### 1. Local Scope

**Only your peers matter:**
```bash
# On Machine A (you know Alice):
trellis peer list
  alice  · https://alice.sprite.trellis.com

# On Machine B (Bob knows only Charlie):
trellis peer list  
  charlie  · https://charlie.sprite.trellis.com

# Alice and Charlie have the same handle locally, but they never interact
```

### 2. Social Graph

**Peers reflect your social connections:**
- You only reference people you know
- Each peer entry includes attestation verification
- Multiple entries with same handle = multiple known people

### 3. Safe by Default

**Cannot target unknown peers:**
```bash
# This fails because "randomperson" is not in YOUR peers.json
$ trellis project clone randomperson/trellis-node
# Error: Unknown peer 'randomperson'

# You must first add them:
$ trellis peer add randomperson <https://random.sprite.trellis.com>
$ trellis project clone randomperson/trellis-node
```

### 4. Identity-Bound

**Each peer entry tied to a specific identity:**
```json
{
  "trentb": {
    "did": "did:key:z6MkouJQKJVPHa97n2uNuzcozGDxSCLYJoKk6uV3JVXrXZrG",
    "entityId": "identity:did:key:z6MkouJQKJVPHa97n2uNuzcozGDxSCLYJoKk6uV3JVXrXZrG",
    "publicKey": "MCowBQYDK2VwAyEAjGTy5XeoPQN2vb+wjptQ2QsBQc/fqq5+1/hIUhZ7jKk=",
    "spriteUrls": ["https://trent.sprite.trellis.com"],
    "displayName": "Trent Brew"
  }
}
```

## Use Cases

### 1. Personal Projects
```bash
# Clone your own projects
$ trellis project clone trentb/trellis-node
$ trellis project clone trentb/docs
```

### 2. Collaborating with Known People
```bash
# Clone projects from people you know
$ trellis peer add alice <https://alice.sprite.trellis.com>
$ trellis project clone alice/data-science
```

### 3. Academic Collaborations
```bash
# Research group members
$ trellis peer add prof_smith <https://smith.university.sprite.trellis.com>
$ trellis project clone prof_smith/paper-submission-guide
```

### 4. Open Source Projects
```bash
# Well-known contributors (you've met them at conferences, etc.)
$ trellis peer add LinusTorvalds <https://linus.sprite.trellis.com>
$ trellis project clone LinusTorvalds/linux
```

## Formalization Plan

### Phase 1: Documentation and Clarification (Week 1-2)

#### 1.1. Update ADR 0032
- Add detailed peer system specification
- Clarify local-scope semantics
- Document social graph properties

#### 1.2. Create User Documentation
- CLI command documentation with examples
- Onboarding guide for peer management
- Best practices for collaboration

#### 1.3. Update Error Messages
- Make peer resolution clearer
- Explain why unknown peers are rejected
- Provide guidance for common scenarios

### Phase 2: UX Improvements (Week 3-4)

#### 2.1. Enhanced Peer Discovery
- Auto-complete for existing peers
- Quick-add for common collaborators
- Context-aware suggestions

#### 2.2. Peer Management Interface
- Visual peer management tool
- Batch operations (add multiple peers)
- Peer verification UI

#### 2.3. Improved Error Handling
- Clear feedback when peer not found
- Guidance for adding missing peers
- Historical context for failed resolutions

### Phase 3: Network Integration (Week 5-6)

#### 3.1. Local Network Discovery
- Bonjour/mDNS peer discovery
- QR code-based peer addition
- Contact import from address books

#### 3.2. Peer Trust Management
- Trust levels for known peers
- Cross-machine peer synchronization
- Trusted networks configuration

#### 3.3. Advanced Features
- Peer groups (research teams, organizations)
- Cross-realm peer delegation
- Automated peer attestation

### Phase 4: Security and Robustness (Week 7-8)

#### 4.1. Security Enhancements
- Multi-device peer management
- Revocation and rotation
- Attack detection (name squatting attempts)

#### 4.2. Backup and Recovery
- Peer list backup/restore
- Cross-machine synchronization
- Recovery key management

#### 4.3. Migration Support
- Import existing peer configurations
- Migration tools for legacy systems
- Backward compatibility guarantees

## Acceptance Criteria

### Phase 1
- [ ] ADR 0032 updated with detailed peer specification
- [ ] User documentation created and published
- [ ] Error messages updated and tested
- [ ] Documentation verified by technical reviewer

### Phase 2
- [ ] Peer discovery UX implemented and tested
- [ ] Peer management interface functional
- [ ] Error handling improved
- [ ] Usability testing completed

### Phase 3
- [ ] Local network discovery operational
- [ ] Peer trust management implemented
- [ ] Advanced features available
- [ ] Performance benchmarks met

### Phase 4
- [ ] Security enhancements in place
- [ ] Backup and recovery tested
- [ ] Migration tools functional
- [ ] All tests passing

## Technical Specifications

### Performance Requirements
- Peer resolution: < 10ms
- Peer list operations: < 50ms
- Peer discovery: < 100ms

### Security Requirements
- Peer entries authenticated (signed genesis)
- Public keys verified at resolution time
- No arbitrary peer targeting (safe by default)

### Compatibility Requirements
- Backward compatible with existing peers.json format
- Works with existing identity system
- Supports both CLI and programmatic access

## Future Extensions

### 1. Peer Networks
- Support for peer groups
- Network-wide peer discovery
- Cross-network authentication

### 2. Reputation System
- Peer reputation tracking
- Trust scoring
- Abuse detection

### 3. Federated Discovery
- Cross-machine peer discovery
- Network-to-network connections
- Global peer search (opt-in)

## Conclusion

The Trellis peer system provides a secure, socially-grounded way to reference identities in a local-first system. Its local-scope design prevents unknown targeting attacks while enabling natural collaboration within known networks.

The formalization plan will enhance the UX, add network capabilities, and make the peer system more robust while maintaining its core safety properties and philosophical consistency with Trellis's design principles.

This approach ensures that `{peer}` remains a **social identifier within your context** rather than a global username, preventing the name squatting and targeting issues that would arise from a global namespace.