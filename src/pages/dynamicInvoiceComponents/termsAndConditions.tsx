const TermsAndConditions = ({
  termsAndConditions,
}: {
  termsAndConditions: { title: string; description: string; icon: React.FC }[];
}) => {
  return (
    <>
      {termsAndConditions.length > 0 && (
        <div className="mt-12">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-900">
            Terms & Conditions
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {termsAndConditions.map((term, i) => {
              const Icon = term.icon;

              return (
                <div
                  key={term.title}
                  className="
              group flex gap-4 rounded-xl border border-slate-200 bg-white p-5
              shadow-sm transition
              hover:border-emerald-300 hover:shadow-md
            "
                >
                  {/* ICON */}
                  <div className="mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 transition group-hover:bg-emerald-100">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="text-left">
                    <p className="mb-1 text-sm font-semibold text-slate-900">
                      {term.title}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {term.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
export default TermsAndConditions;
