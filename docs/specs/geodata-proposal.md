# Proposal: Graph-Native Geodata System for Trellis

**Status:** Proposal  
**Date:** 2026-07-31  
**Context:** Identity-addressed Trellis projects (ADR 0032) + EAV kernel  
**Follow-on:** [`graph-native-geodata.md`](./graph-native-geodata.md)  
**Related:** ADR 0032, TRL-156+, TRL-333  

## Summary

This proposal describes a graph-native approach to geodata in Trellis that treats geographic information as relationships rather than tabular layers. The system enables decentralized, composable, and living spatial representations where "the graph is primary, geometry is just one projection of it."

## The Problem

Traditional GIS systems treat geography as tabular data with special "geometry" columns in separate layers. This approach inherits limitations from CAD and relational databases:

- Geography is stored in rigid schemas with geometry as a special attribute type
- Truth is singular (authoritative layer)
- Spatial queries require complex joins across tables
- Local-first is difficult because data is centralized
- Ownership and provenance are lost in the layers

Trellis's EAV kernel and identity-addressed projects offer a better foundation:

- **Entities** are first-class nodes (a `Tree`, a `Park`, a `Restaurant`)
- **Relationships** are edges (a `Park` `adjacentTo` a `River`)
- **Properties** are attribute triples (a `Tree` `species` "Oak")
- **Truth** is layered and verifiable through attestation chains
- **Identity** is portable and trustworthy

## The Solution

### 1. Location as Address Space

Instead of "geodata," treat location as an addressable namespace within the graph:

```
world
├── us
│   └── ca
│       └── irvine
│           ├── parcel/39218
│           │   ├── owner
│           │   ├── building
│           │   ├── accessibility
│           │   ├── history
│           │   └── events
```

Or graph-native:

```
Park
  adjacentTo → River

River
  crosses → Road

Road
  maintainedBy → City

City
  publishes → Closure Notice
```

### 2. Geospatial Queries as Graph Traversals

```
// Traditional: complex spatial query
SELECT name, accessibility
FROM features, accessibility, geometry
WHERE features.id = accessibility.feature_id
  AND features.id = geometry.feature_id
  AND geometry.centroid within (point(32.8, -117.1), radius(10km))

// Graph-native: composed traversals
Find (Feature)
  .HasGeometry().WithinRadius(Point(32.8, -117.1), 10km)
  .HasAccessibility()
  .ForEach(Feature, Accessibility { Feature.Name, Accessibility.Score })
```

### 3. Layered Truth with Attestation

Multiple sources can assert different properties:

```
Restaurant:
  Owner claims:      Hours = 8-5
  Google claims:     Hours = 8-6
  Customer reports:  Usually closes around 4:45
  Delivery claims:  Pickup unavailable after 4:30
```

Clients verify and choose sources based on context/trust relationships.

### 4. Composable Data Sources

Instead of indexing everything into one database, the graph joins disparate sources:

- City GIS → spatial features, road closures
- OpenStreetMap → road network, points of interest
- Yelp → restaurant data, accessibility claims
- Nonprofit accessibility groups → accessibility audits
- Bike routing APIs → route geometry, segment data

The graph speaks the same language (triples) without one company indexing everything.

### 5. Local-First Implementation

Your phone carries the subgraph of the world you care about:

```
Chicago
├── Friends
├── FavoritePlaces
├── Transit
└── RecentTravel
```

When offline, the map works with cached spatial subgraph. When online, sync only changed pieces, like Git.

### 6. Geometry as Just Another Property

```
Tree
  species → Oak
  planted → 1996
  maintainedBy → Parks Department
  hasSensor → SoilMoistureSensor
  geometry → Polygon([(0,0), (10,0), (10,10), (0,10)])
```

Geometry is just another attribute in the EAV graph.

### 7. Living Places

A `Park` isn't just a polygon:

```
Park
  hosts → FarmersMarket
  contains → Sculpture
  managedBy → City
  visitedBy → Trent
  hasPhoto → PhotoEntity
  featuredIn → Documentary
  underConstruction → true
  createdBy → CityParkDepartment
  createdAt → 2023-05-15
```

Everything attaches naturally to the entity.

## Architectural Benefits

### 1. Graph Database Advantages

- **Relationships are first-class** – roads connect to buildings, buildings contain rooms
- **Dynamic properties** – add `accessibilityScore` to any feature without schema changes
- **Path-based queries** – find all wheelchair-accessible venues along a bike route
- **Federated indexing** – each organization publishes its own claims

### 2. Trellis Integration

- **Identity-scoped entities** – `{owner}/{repo}` namespace applies to spatial features
- **Attestation chains** – verify provenance of spatial claims
- **Op-log safety** – replay history for audit
- **Local-first sync** – working offline with your local spatial subset

### 3. Beyond Maps

This approach extends to:

- **Temporal data** – events, schedules, changes over time
- **Social graphs** – who visited, who recommended
- **Property data** – ownership, zoning, usage rights
- **IoT sensor streams** – real-time environmental data

## Implementation Roadmap

### Phase 1: Core Types

- Define `SpatialFeature`, `Geometry`, `Location` entity types
- Add geometry attribute type (any type, validation optional)
- Build spatial predicate primitives (`within`, `intersects`, `adjacent`)

### Phase 2: Graph Queries

- Implement graph-based spatial queries
- Add spatial predicate operators to TQL
- Build composition operators for multi-source queries

### Phase 3: Federated Discovery

- Implement peer discovery for spatial data
- Add attestation verification for geometry claims
- Build trust models for different spatial sources

### Phase 4: UI Integration

- Add spatial visualization adapters
- Build map overlays that read from graph
- Implement spatial layering and transparency controls

## Files to Modify

- `src/schema/ontology.ts` – add spatial entity types
- `src/query/tql-spatial.ts` – spatial predicate implementations
- `src/ui/layers/geometry-layer.ts` – geometry rendering engine
- `src/vcs/geodata-sync.ts` – geodata synchronization protocols

## Testing Strategy

1. **Unit tests** – spatial predicate correctness
2. **Integration tests** – graph query composition
3. **E2E tests** – real-world queries (wheelchair accessible venues)
4. **Federated tests** – multi-peer geodata sharing

## Acceptance Criteria

1. Geometry can be stored and queried as a graph attribute
2. Multiple sources can assert different spatial properties
3. Clients can compose queries across disparate spatial sources
4. Local-first spatial data sync works correctly
5. Real-world spatial queries (like wheelchair accessibility) are possible

## Future Extensions

- **3D spatial graphs** – volumetric relationships
- **Time-indexed geography** – historical spatial evolution
- **Property rights graphs** – ownership, zoning, usage
- **Sensor-rich environments** – real-time environmental data

## Conclusion

A graph-native geodata system leverages Trellis's core strengths: identity-scoped entities, relationship-first data model, and decentralized sync. It transforms maps from centralized layers into composable, living spatial graphs where geography becomes an address space within the graph itself.

This approach not only solves geodata challenges but also establishes a pattern for other domains (temporal, social, property) to be treated as composable graph layers rather than monolithic tables.