import * as React from "react";

export interface CliDeviceTimelineLabelProps {
  label: string;
  value: string;
}

/**
 * Formatted timeline metadata item (label and timestamp value) for a CLI terminal device.
 */
export const CliDeviceTimelineLabel = ({
  label,
  value,
}: CliDeviceTimelineLabelProps): React.JSX.Element => {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-mini font-mono font-semibold tracking-[0.14em] uppercase">
        {label}
      </dt>
      <dd className="text-foreground text-xs">{value}</dd>
    </div>
  );
};

export default CliDeviceTimelineLabel;
