import { customerCare } from "./constants/constants";
const InvoiceCustomerCare = () => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 bg-yellow-100 p-5 rounded-lg">
        {customerCare.map((item) => (
          <div>
            <h3 className="text-sm font-semibold text-black uppercase mb-4">
              {item.name}
            </h3>
            <div className="p-4 bg-slate-50 border border-gray-400 rounded-lg text-left shadow-sm">
              <p className="text-sm text-black leading-relaxed">
                {item.description}
              </p>

              <span className="font-semibold text-neutral-950">
                {item.phone}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
export default InvoiceCustomerCare;
