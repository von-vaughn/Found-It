import { useState } from "react";
import authService from "@/services/authService";

export function useSensitiveUnlock() {
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [promptOpen, setPromptOpen] = useState(false);

  const requestUnlock = () => setPromptOpen(true);

  const submitPassword = async (password: string): Promise<boolean> => {
    try {
      const ok = await authService.verifyPassword(password);
      if (ok) {
        setUnlocked(true);
        setPromptOpen(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return { unlocked, promptOpen, requestUnlock, submitPassword, setPromptOpen };
}
