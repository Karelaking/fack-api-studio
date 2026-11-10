import * as React from "react";

export interface AuthorizeDeviceRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

/**
 * Metadata entry row for a CLI device request (e.g., requested platform, timestamp).
 */
export const AuthorizeDeviceRow = ({
  icon,
  label,
  value,
}: AuthorizeDeviceRowProps): React.JSX.Element => {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <dt className="text-muted-foreground flex items-center gap-2 text-xs">
        <span aria-hidden="true" className="[&>svg]:size-3.5">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="text-foreground truncate font-mono text-xs">{value}</dd>
    </div>
  );
};

export default AuthorizeDeviceRow;
