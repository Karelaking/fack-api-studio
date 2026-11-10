import * as React from "react";

export interface AuthorizeDeviceCardFrameProps {
  children: React.ReactNode;
}

/**
 * Centered container frame for CLI terminal authorization views.
 */
export const AuthorizeDeviceCardFrame = ({
  children,
}: AuthorizeDeviceCardFrameProps): React.JSX.Element => {
  return (
    <div className="w-full max-w-110">
      <div className="bg-card text-card-foreground ring-foreground/10 rounded-xl px-6 py-6 shadow-sm ring-1 sm:px-7 sm:py-7">
        {children}
      </div>
      <p className="text-muted-foreground text-caption mt-4 text-center leading-relaxed">
        Signed in as your Fack Studio account. Nothing is shared with the
        terminal beyond project access.
      </p>
    </div>
  );
};

export default AuthorizeDeviceCardFrame;
