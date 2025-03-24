import React from "react";

interface StandardHeaderProps {
  headerText: string;
  outline: boolean;
}

const StandardHeader: React.FC<StandardHeaderProps> = ({
  headerText,
  outline = false,
}) => {
  return (
    <h1 className="text-3xl my-1 font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-red-400 relative">
      {outline && (
        <span
          className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-red-400 blur-[2px] 
      [-webkit-text-stroke:1px_#d1d5db] dark:[-webkit-text-stroke:1px_#374151]"
        >
          {headerText}
        </span>
      )}

      <span className="absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-red-400">
        {headerText}
      </span>
      <span className="relative">{headerText}</span>
    </h1>
  );
};

export default StandardHeader;
