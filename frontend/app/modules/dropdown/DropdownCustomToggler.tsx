/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";

type DropdownCustomTogglerProps = {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children: React.ReactNode;
};

export const DropdownCustomToggler = React.forwardRef<
  HTMLAnchorElement,
  DropdownCustomTogglerProps
>((props, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    props.onClick(e);
  };

  return (
    <a
      ref={ref}
      className="btn btn-clean btn-hover-light-primary btn-sm btn-icon"
      onClick={handleClick}
    >
      {props.children}
    </a>
  );
});
