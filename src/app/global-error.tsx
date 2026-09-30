"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en"><body style={{ margin: 0, padding: "15vh 24px", background: "#fafafc", color: "#282330", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, letterSpacing: -1 }}>The catalog is temporarily unavailable.</h1>
      <p style={{ maxWidth: 500, margin: "24px auto", color: "#767580", lineHeight: 1.8 }}>We could not read the model catalog. An administrator may need to check the database connection or catalog file. Your browser watchlist has not been changed.</p>
      <button onClick={reset} style={{ border: 0, borderRadius: 8, padding: "13px 24px", background: "#7454d6", color: "white", cursor: "pointer" }}>Try again</button>
    </body></html>
  );
}
