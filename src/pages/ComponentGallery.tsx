import React from "react";
import componentDocs from "../data/component-docs.json";
import { motion } from "framer-motion";
import { Package, MapPin, FileText, Search } from "lucide-react";

const ComponentGallery: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredDocs = componentDocs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 pt-24 font-sans text-slate-900 dark:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 mb-2">
              Component Gallery
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Exploring {filteredDocs.length} components in the system.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 transition-all w-full md:w-64"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-6 flex flex-col h-full group hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Package className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold truncate" title={doc.name}>
                  {doc.name}
                </h2>
              </div>

              <div className="flex items-start gap-2 mb-4 text-slate-600 dark:text-slate-300 text-sm flex-grow">
                <FileText className="w-4 h-4 mt-1 flex-shrink-0 text-slate-400" />
                <p className="line-clamp-3">
                  {doc.description !== "No description provided." ? (
                    doc.description
                  ) : (
                    <span className="italic opacity-50">
                      No description provided. Add JSDoc to component file.
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-auto">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Used In:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doc.usages.length > 0 ? (
                    doc.usages.slice(0, 3).map((usage) => (
                      <span
                        key={usage}
                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]"
                        title={usage}
                      >
                        {usage.split("/").pop()}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      No direct usages found (may be dynamic)
                    </span>
                  )}
                  {doc.usages.length > 3 && (
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300">
                      +{doc.usages.length - 3} more
                    </span>
                  )}
                </div>

                <div className="mt-3 text-xs text-slate-400 truncate">
                  Path: {doc.path}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComponentGallery;
