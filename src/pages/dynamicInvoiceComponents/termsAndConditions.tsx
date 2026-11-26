const TermsAndConditions = ({
  termsAndConditions,
}: {
  termsAndConditions: { title: string; description: string; icon: React.FC }[];
}) => {
  if (termsAndConditions.length === 0) return null;

  return (
    <section className="mt-8 border-t border-zinc-900/10 pt-6">
      <h2 className="mb-3 text-sm font-medium text-zinc-900">
        Terms and conditions
      </h2>
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {termsAndConditions.map((term) => {
          const Icon = term.icon as React.FC<{
            className?: string;
            strokeWidth?: number;
          }>;
          return (
            <div key={term.title} className="flex gap-3 text-left">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                strokeWidth={1.5}
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {term.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {term.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
export default TermsAndConditions;
