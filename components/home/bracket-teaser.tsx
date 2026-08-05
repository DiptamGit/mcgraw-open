import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const CONNECTORS = [
  "M14 16 H52 V28 H96",
  "M14 40 H52 V28 H96",
  "M14 72 H52 V60 H96",
  "M14 96 H52 V60 H96",
  "M96 28 H134 V44 H172",
  "M96 60 H134 V44 H172",
] as const;

/**
 * A compact preview of the knockout tree. The connectors draw themselves in as
 * a nod to the bracket's signature moment and link straight through to it.
 * Under reduced motion the connectors render fully drawn and static.
 */
export function BracketTeaser() {
  return (
    <Link className="home-teaser" href="/bracket">
      <div className="home-teaser__text">
        <p className="utility-label">Knockout stage</p>
        <span className="home-teaser__cta">
          View the bracket
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </span>
        <p className="home-teaser__hint">
          Eight teams. Three rounds. One champion.
        </p>
      </div>

      <svg
        className="home-teaser__graphic"
        viewBox="0 0 200 112"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {CONNECTORS.map((path, index) => (
          <path
            key={path}
            className="home-teaser__connector"
            d={path}
            pathLength={1}
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
        <path
          className="home-teaser__spine"
          d="M172 44 H188"
          pathLength={1}
          style={{ animationDelay: "540ms" }}
        />
      </svg>
    </Link>
  );
}
