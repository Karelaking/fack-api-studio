"use client";

import * as React from "react";
import { PikaIcon, type IconSvgElement } from "@pikaicons/react";

export interface StackItem {
  id: string;
  name: string;
  icon: IconSvgElement | null;
  iconClasses: string;
}

export interface LogoCloudStackMarkProps {
  item: StackItem;
}

/**
 * Individual technology brand mark with icon and typography label in the logo cloud marquee.
 */
export const LogoCloudStackMark = ({
  item,
}: LogoCloudStackMarkProps): React.JSX.Element => {
  return (
    <div className="text-foreground flex items-center gap-3 text-base font-extrabold tracking-tight sm:text-lg md:text-xl">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl border sm:size-9 ${item.iconClasses}`}
      >
        {item.icon ? (
          <PikaIcon
            icon={item.icon}
            className="size-5 sm:size-6"
            aria-hidden="true"
          />
        ) : (
          <span aria-hidden="true" className="font-mono text-sm font-black">
            N
          </span>
        )}
      </div>
      <span className="text-foreground font-black tracking-tight">
        {item.name}
      </span>
    </div>
  );
};

export default LogoCloudStackMark;
