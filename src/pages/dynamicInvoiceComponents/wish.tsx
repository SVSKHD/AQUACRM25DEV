const InvoiceWish = ({ currentWish }: { currentWish: string }) => {
  if (!currentWish) return null;

  return (
    <p className="mt-8 text-center text-sm text-zinc-600 print:hidden">
      <span className="font-medium text-zinc-900">{currentWish}</span>
      <span className="text-zinc-500"> · from all of us at Aquakart</span>
    </p>
  );
};
export default InvoiceWish;
