import { Phone } from "lucide-react";
import { customerCare } from "./constants/constants";

const InvoiceCustomerCare = () => (
  <section className="mt-8 border-t border-zinc-900/10 pt-6">
    <h2 className="mb-3 text-sm font-medium text-zinc-900">
      Manufacturer customer care
    </h2>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {customerCare.map((item) => (
        <div
          key={item.name}
          className="rounded-xl border border-zinc-900/10 p-4 text-left"
        >
          <p className="text-sm font-medium text-zinc-900">{item.name}</p>
          <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
          <a
            href={`tel:${item.phone}`}
            className="mt-3 inline-flex items-center gap-2 font-mono text-sm text-zinc-900 underline-offset-4 hover:underline"
          >
            <Phone className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
            {item.phone}
          </a>
        </div>
      ))}
    </div>
  </section>
);
export default InvoiceCustomerCare;
