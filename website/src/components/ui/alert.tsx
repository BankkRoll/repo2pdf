import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  LucideIcon,
} from "lucide-react"; // Ensure you have lucide-react installed

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        info: "bg-blue-100 text-blue-700 border-blue-500 dark:bg-blue-900 dark:text-blue-300",
        warning:
          "bg-yellow-100 text-yellow-700 border-yellow-500 dark:bg-yellow-900 dark:text-yellow-300",
        error:
          "bg-red-100 text-red-700 border-red-500 dark:bg-red-900 dark:text-red-300",
        success:
          "bg-green-100 text-green-700 border-green-500 dark:bg-green-900 dark:text-green-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const IconMap: Record<string, LucideIcon> = {
  default: Info,
  destructive: XCircle, // You can choose an appropriate icon for the destructive variant
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const iconVariant = variant ?? "default";
    const Icon = IconMap[iconVariant] || Info;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-4 w-4" />
        {children}
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
