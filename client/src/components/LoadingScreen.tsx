import React from "react";

interface LoadingScreenProps {
  message: string;
}

/** Invisible status for pending auth checks; nothing is rendered visually. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => (
  <p role="status" aria-live="polite" className="sr-only">
    {message}
  </p>
);
