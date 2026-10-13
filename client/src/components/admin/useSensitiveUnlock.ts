import { useState } from "react";

// UI-ONLY DEMO GATE — no backend check yet. There are no real account
// passwords in this demo (sign-in is OTP based), so the re-entry prompt
// below verifies against this constant purely so the lock/unlock flow can
// be reviewed. Do not treat hidden values as secure until a backend check
// is wired in.
export const DEMO_ADMIN_PASSWORD = "admin123";

export function useSensitiveUnlock() {
  // Always starts locked. Unlock lasts only while this page is mounted —
  // navigating away locks everything again, so the prompt is demonstrable
  // on every visit.
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const requestUnlock = () => setPromptOpen(true);

  const submitPassword = (password: string): boolean => {
    if (password === DEMO_ADMIN_PASSWORD) {
      setUnlocked(true);
      setPromptOpen(false);
      return true;
    }
    return false;
  };

  return { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen };
}
