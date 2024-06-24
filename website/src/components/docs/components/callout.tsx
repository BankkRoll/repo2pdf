// src/components/docs/callout.tsx

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  LucideIcon,
  XCircle,
} from "lucide-react";

import React from "react";

interface CalloutProps {
  type: "info" | "warning" | "error" | "success" | "default";
  title?: string;
  children: React.ReactNode;
}

const IconMap: Record<string, LucideIcon> = {
  default: Info,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

export const Callout: React.FC<CalloutProps> = ({
  type = "default",
  title,
  children,
}) => {
  const Icon = IconMap[type];

  return (
    <Alert className="my-4" variant={type}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
};
