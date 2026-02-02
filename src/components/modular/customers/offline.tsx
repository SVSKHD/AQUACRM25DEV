import { motion } from "framer-motion";
import { ArrowRight, Mail, User } from "lucide-react";

interface OfflineCustomer {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_count: number;
  total_spent: number;
  products: string[];
  last_order_date: string;
}

interface AquaOfflineCustomerProps {
  filteredCustomers: OfflineCustomer[];
  onSend: (phone: string) => void;
  onEmail: (email: string) => void;
  onConvert: (customer: OfflineCustomer) => void;
  onCopy: (text: string) => void;
}

const AquaOfflineCustomer = ({
  filteredCustomers,
  onSend,
  onEmail,
  onConvert,
  onCopy,
}: AquaOfflineCustomerProps) => {
  return (
    <motion.div
      key="offline"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="overflow-x-auto"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
            <th className="py-3 px-4 font-medium">Name</th>
            <th className="py-3 px-4 font-medium">Phone No</th>
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Address</th>
            <th className="py-3 px-4 font-medium">Last Order</th>
            <th className="py-3 px-4 font-medium">Stats</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map((customer, index) => (
            <motion.tr
              key={customer.customer_email || customer.customer_phone || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg text-white">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white text-sm">
                      {customer.customer_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-white/60">
                      {customer.products.slice(0, 2).join(", ")}...
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => onCopy(customer.customer_phone)}
                >
                  <span>{customer.customer_phone}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-slate-200 dark:bg-white/20 px-1 rounded">
                    Copy
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                {customer.customer_email}
              </td>
              <td
                className="py-3 px-4 text-sm text-black dark:text-white/80 max-w-[200px] truncate"
                title={customer.customer_address}
              >
                {customer.customer_address}
              </td>
              <td className="py-3 px-4 text-sm text-slate-500">
                {customer.last_order_date}
              </td>
              <td className="py-3 px-4">
                <div className="text-xs">
                  <span className="block font-medium text-green-600">
                    ₹{customer.total_spent.toLocaleString()}
                  </span>
                  <span className="text-slate-500">
                    {customer.invoice_count} Invoices
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSend(customer.customer_phone)}
                    title="Send Message"
                    className="p-2 text-green-600 bg-green-50 dark:bg-green-500/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onEmail(customer.customer_email)}
                    title="Send Email"
                    className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onConvert(customer)}
                    className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-all"
                  >
                    Convert
                  </motion.button>
                </div>
              </td>
            </motion.tr>
          ))}
          {filteredCustomers.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-slate-500">
                No offline customers found matching filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
};

export default AquaOfflineCustomer;
