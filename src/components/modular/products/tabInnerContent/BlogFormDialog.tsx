import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface Blog {
  _id?: string;
  title: string;
  description: string;
  titleImages: { secure_url: string }[];
  photos: { secure_url: string }[];
  // Add other fields as necessary, but keeping it simple for the form first
}

interface BlogFormDialogProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData: Blog | null;
}

const BlogFormDialog = ({
  show,
  onClose,
  onSubmit,
  initialData,
}: BlogFormDialogProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    photos: [] as { secure_url: string }[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        imageUrl: initialData.titleImages?.[0]?.secure_url || "",
        photos: initialData.photos || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        photos: [],
      });
    }
  }, [initialData, show]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, { secure_url: reader.result as string }],
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Construct the payload matching the expected structure
      const payload = {
        ...initialData,
        title: formData.title,
        description: formData.description,
        titleImages: [{ secure_url: formData.imageUrl }],
        photos: formData.photos,
        // Add default values for required fields if creating new
        keywords: initialData?.keywords || "",
        notes: initialData?.notes || "",
        category: initialData?.category || "6528debce9e8a06a49a23b2c", // Default or select
        product: initialData?.product || "65cb8d113de7fc5e7a9ce1c8", // Default or select
        brand: initialData?.brand || "Aquakart",
      };

      await onSubmit(payload);
      onClose();
    } catch (error) {
      console.error("Error submitting blog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 overlay-blur flex items-center justify-center z-[200] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
              <h3 className="text-xl font-bold text-neutral-950 dark:text-white">
                {initialData ? "Edit Blog" : "Create New Blog"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
              <form
                id="blog-form"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="glass-input w-full"
                    placeholder="Enter blog title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Title Image
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-full">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
                      />
                    </div>
                  </div>
                  {formData.imageUrl && (
                    <div className="mt-4 relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          Preview
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Gallery Photos
                  </label>
                  <div className="relative w-full mb-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotosUpload}
                      className="glass-input w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-400"
                    />
                  </div>

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {formData.photos.map((photo, index) => (
                        <div
                          key={index}
                          className="relative h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group"
                        >
                          <img
                            src={photo.secure_url}
                            alt={`Gallery ${index}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black dark:text-white/70 mb-2">
                    Content (HTML)
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="glass-input w-full min-h-[200px] font-mono text-sm"
                    placeholder="<p>Write your content here...</p>"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Supports HTML tags for formatting.
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-white/5 text-black dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="blog-form"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Saving..."
                  : initialData
                    ? "Update Blog"
                    : "Create Blog"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BlogFormDialog;
