const InvoiceWish = ({ currentWish }: { currentWish: string }) => {
  return (
    <>
      {currentWish && (
        <div className="mt-8 text-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100 print:hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-800 italic font-serif mb-2">
            {currentWish}
          </h1>
          <p className="text-sm text-indigo-600">From all of us at Aquakart</p>
        </div>
      )}
    </>
  );
};
export default InvoiceWish;
