import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AuthContext, type User } from "@/context/auth-context";

const LOCAL_STORAGE_USER_KEY = "foundit_auth_user";
const LOCAL_STORAGE_PENDING_KEY = "foundit_auth_pending_email";
const LOCAL_STORAGE_OTP_KEY = "foundit_auth_current_otp";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [pendingEmail, setPendingEmailState] = useState<string | null>(() => {
    return localStorage.getItem(LOCAL_STORAGE_PENDING_KEY) || null;
  });

  const [currentOtp, setCurrentOtp] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_OTP_KEY) || "123456";
  });

  const [registeredUsers, setRegisteredUsers] = useState<
    Record<string, { name: string; studentId?: string }>
  >(() => {
    try {
      const saved = localStorage.getItem("foundit_registered_users");
      return saved
        ? JSON.parse(saved)
        : {
            "student@campus.edu": {
              name: "Alex Rivera",
              studentId: "STU-2026-9041",
            },
          };
    } catch {
      return {
        "student@campus.edu": {
          name: "Alex Rivera",
          studentId: "STU-2026-9041",
        },
      };
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (pendingEmail) {
      localStorage.setItem(LOCAL_STORAGE_PENDING_KEY, pendingEmail);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_PENDING_KEY);
    }
  }, [pendingEmail]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_OTP_KEY, currentOtp);
  }, [currentOtp]);

  const setPendingEmail = (email: string) => {
    setPendingEmailState(email);
  };

  const generateOtp = (): string => {
    // Generate 6-digit random code or default to reliable standard
    const digits = Math.floor(100000 + Math.random() * 900000).toString();
    return digits;
  };

  const sendOtp = (email: string): string => {
    const code = generateOtp();
    setCurrentOtp(code);
    setPendingEmailState(email);
    toast.success(
      `Your 6-digit authentication code is: ${code} (Demo test code: 123456 also accepted)`,
      {
        duration: 9000,
        icon: "🔐",
      },
    );
    return code;
  };

  const login = async (email: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const allowedDomains = ["@wmsu.edu.ph", "@campus.edu"];
    const isKnownUser =
      trimmedEmail in registeredUsers ||
      allowedDomains.some((domain) => trimmedEmail.endsWith(domain));

    if (!isKnownUser) {
      toast.error(
        "Account not found. Please sign up or use a valid school email.",
      );
      return false;
    }

    const profile = registeredUsers[trimmedEmail] || {
      name: trimmedEmail.split("@")[0].replace(/[._-]/g, " "),
      studentId: "",
    };

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: profile.name,
      email: trimmedEmail,
      studentId: profile.studentId,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        profile.name,
      )}`,
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    setPendingEmailState(null);
    toast.success(`Welcome back, ${newUser.name}!`, {
      icon: "🎉",
    });
    return true;
  };

  const signup = async (userData: {
    name: string;
    email: string;
    studentId?: string;
  }): Promise<boolean> => {
    const trimmedEmail = userData.email.trim().toLowerCase();
    setPendingEmailState(trimmedEmail);

    const updated = {
      ...registeredUsers,
      [trimmedEmail]: {
        name: userData.name.trim(),
        studentId: userData.studentId?.trim(),
      },
    };
    setRegisteredUsers(updated);
    localStorage.setItem("foundit_registered_users", JSON.stringify(updated));

    sendOtp(trimmedEmail);
    return true;
  };

  const verifyOtp = async (
    code: string,
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = code.trim();

    // Accept both dynamic generated code and universal demo code '123456'
    if (cleanCode === currentOtp || cleanCode === "123456") {
      const email = pendingEmail || "student@campus.edu";
      const profile = registeredUsers[email] || {
        name: email.split("@")[0].replace(/[._-]/g, " "),
        studentId: "STU-2026-9041",
      };

      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: profile.name,
        email: email,
        studentId: profile.studentId,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          profile.name,
        )}`,
        createdAt: new Date().toISOString(),
      };

      setUser(newUser);
      setPendingEmailState(null);
      toast.success(`Welcome back, ${newUser.name}!`, {
        icon: "🎉",
      });
      return { success: true };
    }

    return {
      success: false,
      message:
        "Invalid 6-digit verification code. Please try again or use 123456.",
    };
  };

  const logout = () => {
    setUser(null);
    setPendingEmailState(null);
    toast.success("Successfully signed out.", {
      icon: "👋",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        pendingEmail,
        currentOtp,
        setPendingEmail,
        sendOtp,
        login,
        signup,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
