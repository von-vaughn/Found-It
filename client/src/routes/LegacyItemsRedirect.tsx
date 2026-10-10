import { Navigate, useSearchParams } from "react-router-dom";

export function LegacyItemsRedirect({ type }: { type: "lost" | "found" }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim();
  return (
    <Navigate
      to={
        query
          ? `/browse?type=${type}&q=${encodeURIComponent(query)}`
          : `/browse?type=${type}`
      }
      replace
    />
  );
}
