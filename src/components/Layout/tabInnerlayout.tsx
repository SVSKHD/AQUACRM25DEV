import React from "react";

interface TabInnerContentProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

const TabInnerContent: React.FC<TabInnerContentProps> = ({
  children,
  title,
  description,
}) => {
  return (
    <>
      <div>
        <div className="text-center mb-5">
          <h2 className="text-2xl font-bold text-neutral-950 dark:text-white mb-2">
            {title}
          </h2>
          <p className="text-black dark:text-white/60">{description}</p>
        </div>
        {children}
      </div>
    </>
  );
};
export default TabInnerContent;
