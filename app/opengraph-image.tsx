import { ImageResponse } from "next/og";

export const alt = "McGraw Open 2026 doubles tennis tournament";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const INK_950 = "#07090C";
const VOLT_500 = "#D6FF3F";
const INK_200 = "#C2CAD6";
const WHITE = "#FFFFFF";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: INK_950,
          color: WHITE,
          display: "flex",
          height: "100%",
          overflow: "hidden",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Court linework, matching the site's hero device. */}
        <div
          style={{
            border: `2px solid ${WHITE}`,
            display: "flex",
            height: 470,
            left: 96,
            opacity: 0.16,
            position: "absolute",
            top: 80,
            width: 1008,
          }}
        />
        <div
          style={{
            background: WHITE,
            display: "flex",
            height: 2,
            left: 96,
            opacity: 0.16,
            position: "absolute",
            top: 315,
            width: 1008,
          }}
        />
        <div
          style={{
            background: WHITE,
            display: "flex",
            height: 470,
            left: 600,
            opacity: 0.16,
            position: "absolute",
            top: 80,
            width: 2,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
            padding: "78px 80px 66px",
            width: "100%",
          }}
        >
          <div
            style={{
              color: VOLT_500,
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            August 1 — September 30 · 2026
          </div>

          <div
            style={{
              display: "flex",
              fontFamily: "Arial Narrow, sans-serif",
              fontSize: 150,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            <span>McGraw&nbsp;</span>
            <span style={{ color: VOLT_500 }}>Open</span>
          </div>

          <div
            style={{
              borderTop: "1px solid #232B38",
              color: INK_200,
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 28,
              fontWeight: 600,
              justifyContent: "space-between",
              paddingTop: 28,
              width: "100%",
            }}
          >
            <span>Twelve doubles teams. Two groups. One title.</span>
            <span style={{ color: VOLT_500 }}>mcgrawopen.com</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
