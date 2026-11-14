import { RoutingPreference, TransportMode } from "@omnitransit/shared";
import { computeEdgeWeight, GraphEdge, TransitGraph } from "./graph";

export interface ShortestPathResult {
  edges: GraphEdge[];
  totalWeight: number;
  algorithm: "DIJKSTRA" | "ASTAR";
}

/**
 * Baseline Dijkstra's Shortest-Path Algorithm over the multi-modal TransitGraph.
 */
export function runDijkstra(
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
  const distances = new Map<string, number>();
  const previousEdge = new Map<string, GraphEdge>();
  const visited = new Set<string>();

  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Number.POSITIVE_INFINITY);
  }
  distances.set(startNodeId, 0);

  while (visited.size < graph.nodes.size) {
    let currentId: string | null = null;
    let smallestDist = Number.POSITIVE_INFINITY;

    for (const [nodeId, dist] of distances.entries()) {
      if (!visited.has(nodeId) && dist < smallestDist) {
        smallestDist = dist;
        currentId = nodeId;
      }
    }

    if (currentId === null || smallestDist === Number.POSITIVE_INFINITY) {
      break;
    }

    if (currentId === targetNodeId) {
      break;
    }

    visited.add(currentId);

    const neighbors = graph.getNeighbors(currentId);
    for (const edge of neighbors) {
      if (visited.has(edge.toNodeId)) continue;

      const weight = computeEdgeWeight(edge, profile, options);
      if (!Number.isFinite(weight)) continue;

      // Small transfer penalty when switching transit lines
      const prev = previousEdge.get(currentId);
      const transferPenalty = prev && prev.routeName !== edge.routeName ? 2.5 : 0;

      const candidateDist = smallestDist + weight + transferPenalty;
      if (candidateDist < (distances.get(edge.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.toNodeId, candidateDist);
        previousEdge.set(edge.toNodeId, edge);
      }
    }
  }

  const finalDistance = distances.get(targetNodeId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(finalDistance)) {
    return null;
  }

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
    totalWeight: Number(finalDistance.toFixed(2)),
    algorithm: "DIJKSTRA"
  };
}
