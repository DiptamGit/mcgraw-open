import { ImageResponse } from "next/og";

export const alt = "McGraw Open 2026 doubles tennis tournament";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#071A33",
          color: "#FFFFFF",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#1646A0",
            display: "flex",
            height: "100%",
            position: "absolute",
            right: 0,
            width: 430,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "70px 64px 58px",
            width: 790,
          }}
        >
          <div
            style={{
              color: "#D7FF3F",
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            2026 doubles tennis
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Arial Narrow, sans-serif",
              fontSize: 118,
              fontWeight: 800,
              letterSpacing: "-0.055em",
              lineHeight: 0.82,
              textTransform: "uppercase",
            }}
          >
            <span>McGraw</span>
            <span>Open</span>
          </div>

          <div
            style={{
              borderTop: "2px solid rgba(255,255,255,0.5)",
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 28,
              fontWeight: 600,
              justifyContent: "space-between",
              letterSpacing: "0.02em",
              paddingTop: 24,
              width: 650,
            }}
          >
            <span>August 1 - September 30</span>
            <span>McGraw Open</span>
          </div>
        </div>

        <div
          aria-hidden="true"
          style={{
            border: "3px solid #FFFFFF",
            bottom: 56,
            display: "flex",
            height: 518,
            position: "absolute",
            right: -42,
            width: 390,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              height: 3,
              left: 0,
              position: "absolute",
              top: 258,
              width: "100%",
            }}
          />
          <div
            style={{
              background: "#FFFFFF",
              height: "100%",
              left: 194,
              position: "absolute",
              top: 0,
              width: 3,
            }}
          />
        </div>

        <div
          aria-hidden="true"
          style={{
            background: "#D7FF3F",
            border: "5px solid #071A33",
            borderRadius: "50%",
            display: "flex",
            height: 48,
            position: "absolute",
            right: 128,
            top: 160,
            width: 48,
          }}
        />
      </div>
    ),
    size,
  );
}
