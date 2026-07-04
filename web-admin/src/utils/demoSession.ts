"use client";

// Client-only demo mode. When active, authFetch serves mock data instead of
// hitting the backend, so nothing is written to the database.

const DEMO_FLAG = "trocare.demoMode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_FLAG) === "1";
}

export function startDemoSession() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_FLAG, "1");
  // A recognizable fake token so session guards treat the user as logged in.
  localStorage.setItem("accessToken", "demo-token");
  localStorage.setItem("userRole", "OWNER");
  localStorage.setItem("userName", "Chủ trọ Demo");
  localStorage.setItem("userEmail", "demo@trocare.app");
  localStorage.setItem("userStatus", "ACTIVE");
  localStorage.setItem("approvalStatus", "APPROVED");
  localStorage.setItem("isProfileCompleted", "true");
  localStorage.setItem("onboardingStep", "DONE");
  sessionStorage.setItem("justLoggedIn", "true");
}

export function exitDemoSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_FLAG);
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userStatus");
  localStorage.removeItem("approvalStatus");
  localStorage.removeItem("isProfileCompleted");
  localStorage.removeItem("onboardingStep");
  localStorage.removeItem("userPermissions");
}
