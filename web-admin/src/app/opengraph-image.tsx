import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "TrọCare - Phần mềm quản lý trọ miễn phí";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 32,
            background: "rgba(255,255,255,0.16)",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            Tc
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: -2,
          }}
        >
          TrọCare
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 32,
            fontWeight: 500,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          Phần mềm quản lý trọ miễn phí
        </div>
      </div>
    ),
    { ...size }
  );
}
