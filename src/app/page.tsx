"use client";

import dynamic from "next/dynamic";

const ArtPieceScene = dynamic(() => import("@/components/ArtPieceScene"), {
  ssr: false,
  loading: () => <div className="status">Building…</div>,
});

export default function Home() {
  return (
    <main>
      <ArtPieceScene />
    </main>
  );
}
