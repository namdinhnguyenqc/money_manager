"use client";

import React from "react";
import OwnerWorkspaceShell from "@/components/owner/OwnerWorkspaceShell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerWorkspaceShell>{children}</OwnerWorkspaceShell>;
}
