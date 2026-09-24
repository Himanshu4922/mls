"use client";

/**
 * Last-resort boundary for failures in the root layout itself.
 * It replaces the layout, so it must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en-CA">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          color: "#151515",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#6f7682", maxWidth: "32rem" }}>
          We hit an unexpected problem. Please try again.
        </p>
        {error.digest && (
          <p style={{ color: "#9fa3aa", fontSize: "0.75rem" }}>
            Reference: {error.digest}
          </p>
        )}
        <button
          onClick={() => retry()}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.75rem",
            background: "#1b2e4b",
            color: "white",
            border: "none",
            padding: "0.7rem 1.4rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
