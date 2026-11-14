import { RoutingPreference, TransportMode } from "@omnitransit/shared";
import { haversineDistanceKm } from "../utils/geo";
import { computeEdgeWeight, GraphEdge, TransitGraph } from "./graph";
import { ShortestPathResult } from "./dijkstra";

/**
 * A* Geospatial Heuristic Search for fast route optimization.
 */
export function runAStar(
  graph: TransitGraph,
  startNodeId: string,
  targetNodeId: string,
  profile: RoutingPreference,
  options: {
    saferouteEnabled: boolean;
    womenNightMode?: boolean;
    weatherAvoidance: boolean;
    preferredModes?: TransportMode[];
    penalizeEdgeIds?: Set<string>;
  }
): ShortestPathResult | null {
  const targetNode = graph.nodes.get(targetNodeId);
  if (!targetNode) return null;

  const heuristic = (nodeId: string): number => {
    const node = graph.nodes.get(nodeId);
    if (!node) return 0;
    const distKm = haversineDistanceKm(node.location, targetNode.location);
    // Optimistic heuristic: fastest metro speed ~ 50 km/h => 1.2 min/km
    return distKm * 1.2;
  };

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previousEdge = new Map<string, GraphEdge>();
  const openSet = new Set<string>([startNodeId]);
  const closedSet = new Set<string>();

  for (const nodeId of graph.nodes.keys()) {
    gScore.set(nodeId, Number.POSITIVE_INFINITY);
    fScore.set(nodeId, Number.POSITIVE_INFINITY);
  }

  gScore.set(startNodeId, 0);
  fScore.set(startNodeId, heuristic(startNodeId));

  while (openSet.size > 0) {
    let currentId: string | null = null;
    let lowestF = Number.POSITIVE_INFINITY;

    for (const id of openSet) {
      const score = fScore.get(id) ?? Number.POSITIVE_INFINITY;
      if (score < lowestF) {
        lowestF = score;
        currentId = id;
      }
    }

    if (!currentId) break;
    if (currentId === targetNodeId) {
      const pathEdges: GraphEdge[] = [];
      let cursor = targetNodeId;
      while (cursor !== startNodeId) {
        const edge = previousEdge.get(cursor);
        if (!edge) return null;
        pathEdges.unshift(edge);
        cursor = edge.fromNodeId;
      }
      return {
        edges: pathEdges,
        totalWeight: Number((gScore.get(targetNodeId) ?? 0).toFixed(2)),
        algorithm: "ASTAR"
      };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    for (const edge of graph.getNeighbors(currentId)) {
      if (closedSet.has(edge.toNodeId)) continue;

      const weight = computeEdgeWeight(edge, profile, options);
      if (!Number.isFinite(weight)) continue;

      const prev = previousEdge.get(currentId);
      const transferPenalty = prev && prev.routeName !== edge.routeName ? 2.5 : 0;

      const tentativeG = (gScore.get(currentId) ?? Number.POSITIVE_INFINITY) + weight + transferPenalty;
      if (tentativeG < (gScore.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        previousEdge.set(edge.toNodeId, edge);
        gScore.set(edge.toNodeId, tentativeG);
        fScore.set(edge.toNodeId, tentativeG + heuristic(edge.toNodeId));
        openSet.add(edge.toNodeId);
      }
    }
  }

  return null;
}
