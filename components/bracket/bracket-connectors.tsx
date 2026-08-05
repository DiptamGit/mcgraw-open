"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { BRACKET_EDGES, type BracketEdgeId } from "@/lib/bracket";

type BracketConnectorsProps = {
  ballRoute: BracketEdgeId[];
  highlightedEdges: BracketEdgeId[];
};

type Point = { x: number; y: number };

type ConnectorGeometry = {
  ballPath: string | null;
  base: { id: string; d: string }[];
  height: number;
  highlighted: { id: string; d: string; delay: number }[];
  width: number;
};

const ROUND_DRAW_DELAY: Record<string, number> = {
  QF: 0,
  SF: 0.8,
  Fi: 1.6,
};

function pointsToPath(points: Point[]): string {
  return points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`,
    )
    .join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function relativeRect(node: Element, origin: DOMRect) {
  const rect = node.getBoundingClientRect();

  return {
    left: rect.left - origin.left,
    right: rect.right - origin.left,
    top: rect.top - origin.top,
    bottom: rect.bottom - origin.top,
    centerY: rect.top + rect.height / 2 - origin.top,
  };
}

/**
 * Points describing one elbow connector between two cards. A card that sits to
 * the right of its source uses a horizontal elbow (the desktop columns); a card
 * stacked below routes through a left-hand rail (the phone layout).
 */
function connectorPoints(
  source: ReturnType<typeof relativeRect>,
  target: ReturnType<typeof relativeRect>,
): Point[] {
  const horizontal = target.left > source.right - 2;

  if (horizontal) {
    const midX = source.right + (target.left - source.right) / 2;

    return [
      { x: source.right, y: source.centerY },
      { x: midX, y: source.centerY },
      { x: midX, y: target.centerY },
      { x: target.left, y: target.centerY },
    ];
  }

  const railX = Math.max(4, Math.min(source.left, target.left) - 12);

  return [
    { x: source.left, y: source.centerY },
    { x: railX, y: source.centerY },
    { x: railX, y: target.centerY },
    { x: target.left, y: target.centerY },
  ];
}

/**
 * The connector layer for the knockout board. It measures the rendered card
 * positions and draws decorative base lines plus the volt champion path and its
 * travelling ball. The board is complete DOM content on its own; this layer is
 * an aria-hidden enhancement that only appears once the geometry is measured.
 */
export function BracketConnectors({
  ballRoute,
  highlightedEdges,
}: BracketConnectorsProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [geometry, setGeometry] = useState<ConnectorGeometry | null>(null);

  const highlightedKey = highlightedEdges.join("|");
  const ballKey = ballRoute.join("|");

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const board = svg?.parentElement;

    if (!svg || !board) {
      return;
    }

    const highlighted = new Set(highlightedKey ? highlightedKey.split("|") : []);
    const ballEdges = ballKey ? ballKey.split("|") : [];

    const measure = () => {
      const origin = board.getBoundingClientRect();
      const pointsByEdge = new Map<string, Point[]>();

      const nodeRect = (node: string) => {
        const element = board.querySelector(`[data-bracket-node="${node}"]`);
        return element ? relativeRect(element, origin) : null;
      };

      const baseSegments: ConnectorGeometry["base"] = [];
      const highlightedSegments: ConnectorGeometry["highlighted"] = [];

      for (const edge of BRACKET_EDGES) {
        const source = nodeRect(edge.from);
        const target = nodeRect(edge.to);

        if (!source || !target) {
          continue;
        }

        const points = connectorPoints(source, target);
        pointsByEdge.set(edge.id, points);

        const d = pointsToPath(points);
        baseSegments.push({ id: edge.id, d });

        if (highlighted.has(edge.id)) {
          highlightedSegments.push({
            id: edge.id,
            d,
            delay: ROUND_DRAW_DELAY[edge.from.slice(0, 2)] ?? 0,
          });
        }
      }

      const ballPoints: Point[] = [];

      for (const id of ballEdges) {
        const points = pointsByEdge.get(id);

        if (points) {
          ballPoints.push(...points);
        }
      }

      setGeometry({
        ballPath: ballPoints.length > 1 ? pointsToPath(ballPoints) : null,
        base: baseSegments,
        height: board.clientHeight,
        highlighted: highlightedSegments,
        width: board.clientWidth,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(board);

    return () => observer.disconnect();
  }, [ballKey, highlightedKey]);

  useEffect(() => {
    const handleResize = () => {
      const board = svgRef.current?.parentElement;

      if (board) {
        setGeometry((current) =>
          current
            ? { ...current, width: board.clientWidth, height: board.clientHeight }
            : current,
        );
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <svg
      ref={svgRef}
      className="bracket-connectors"
      width={geometry?.width ?? 0}
      height={geometry?.height ?? 0}
      viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined}
      aria-hidden="true"
      focusable="false"
    >
      {geometry?.base.map((segment) => (
        <path
          key={segment.id}
          className="bracket-path bracket-path--base"
          d={segment.d}
        />
      ))}
      {geometry?.highlighted.map((segment) => (
        <path
          key={segment.id}
          className="bracket-path bracket-path--champion"
          d={segment.d}
          pathLength={1}
          style={{ animationDelay: `${segment.delay}s` }}
        />
      ))}
      {geometry?.ballPath ? (
        <>
          <path
            id="bracket-ball-path"
            className="bracket-ball-track"
            d={geometry.ballPath}
            fill="none"
            stroke="none"
          />
          <circle className="bracket-ball" r={3}>
            <animateMotion
              dur="1.2s"
              begin="2.4s"
              fill="freeze"
              repeatCount="1"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#bracket-ball-path" />
            </animateMotion>
          </circle>
        </>
      ) : null}
    </svg>
  );
}
