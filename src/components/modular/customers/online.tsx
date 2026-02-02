import { motion } from "framer-motion";
import { Copy, Edit2, Mail, Trash2, Building2, ArrowRight } from "lucide-react";

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  total_revenue: number;
  created_at: string;
}

interface AquaOnlineCustomerProps {
  filteredCustomers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onSend: (phone: string) => void;
  onEmail: (email: string) => void;
  onCopy: (text: string) => void;
}

const statusColors: Record<string, string> = {
  active:
    "bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300",
  inactive: "bg-slate-100 dark:bg-white/10 text-black dark:text-white/70",
};

const AquaOnlineCustomer = ({
  filteredCustomers,
  onEdit,
  onDelete,
  onSend,
  onEmail,
  onCopy,
}: AquaOnlineCustomerProps) => {
  return (
    <>
      <motion.div
        key="online"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="overflow-x-auto"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Phone No</th>
              <th className="py-3 px-4 font-medium">Email</th>
              <th className="py-3 px-4 font-medium">Address</th>
              <th className="py-3 px-4 font-medium">Created On</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((customer, index) => (
              <motion.tr
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg text-white">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-950 dark:text-white text-sm">
                        {customer.company_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/60">
                        {customer.contact_name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                  {customer.phone ? (
                    <div
                      className="flex items-center gap-2 group cursor-pointer"
                      onClick={() => onCopy(customer.phone!)}
                    >
                      <span>{customer.phone}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-slate-200 dark:bg-white/20 px-1 rounded">
                        Copy
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-sm text-black dark:text-white/80">
                  {customer.email}
                </td>
                <td
                  className="py-3 px-4 text-sm text-black dark:text-white/80 max-w-[200px] truncate"
                  title={customer.address || ""}
                >
                  {customer.address || "-"}
                </td>
                <td className="py-3 px-4 text-sm text-slate-500">
                  {customer.created_at}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[
                        customer.status as keyof typeof statusColors
                      ] || statusColors.inactive
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {customer.phone && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onSend(customer.phone!)}
                        title="Send Message"
                        className="p-2 text-green-600 bg-green-50 dark:bg-green-500/10 rounded-lg hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    )}
                    {customer.email && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEmail(customer.email)}
                        title="Send Email"
                        className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEdit(customer)}
                      className="p-2 text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(customer.id)}
                      className="p-2 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No online customers found matching filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
    </>
  );
};

export default AquaOnlineCustomer;
