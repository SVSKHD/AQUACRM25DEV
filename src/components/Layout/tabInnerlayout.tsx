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
    <section className="crm-tab-content">
      {(title || description) && (
        <header className="crm-tab-header">
          {title && (
            <h2 className="text-2xl font-bold text-neutral-950 dark:text-white mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-black dark:text-white/60">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
};
export default TabInnerContent;
