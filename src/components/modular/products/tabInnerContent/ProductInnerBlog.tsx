import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { blogService } from "../../../../services/apiService";
import { Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BlogFormDialog from "./BlogFormDialog";
import BlogDeleteDialog from "./BlogDeleteDialog";
import { useToast } from "../../../Toast";
import { hasBlogPrefill } from "../../../../utils/blogPrefill";
import { extractArrayPayload } from "../../../../utils/apiPayload";
import { LiquidButton } from "../../../ui/liquid";

interface Blog {
  _id: string;
  title: string;
  description: string;
  titleImages: { secure_url: string }[];
  keywords: string;
  notes: string;
  photos: { secure_url: string }[];
  category: string;
  product: string;
  brand: string;
  ratings: number;
  numberOfReviews: number;
  createdAt: string;
}

const BlogCard = ({
  blog,
  onEdit,
  onDelete,
}: {
  blog: Blog;
  onEdit: (blog: Blog) => void;
  onDelete: (blog: Blog) => void;
}) => {
  return (
    <div className="relative overflow-hidden flex flex-col h-full group transition-all duration-300 hover:-translate-y-2">
      {/* Clearer Glass Background */}
      <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-[2rem] shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-500/10 transition-all duration-300" />

      <div className="relative z-10 p-2 flex flex-col h-full">
        <div className="relative h-48 overflow-hidden rounded-[1.5rem] mb-2">
          <img
            src={
              blog.titleImages?.[0]?.secure_url ||
              blog.photos?.[0]?.secure_url ||
              "/Default.png"
            }
            alt={blog.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-3 flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-neutral-950 dark:text-white mb-2 line-clamp-1 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {blog.title}
          </h3>

          {[blog.brand, blog.keywords].filter(Boolean).length > 0 && (
            <p className="text-xs text-neutral-500 mb-1 line-clamp-1">
              {[blog.brand, blog.keywords].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="mt-auto flex gap-2 pt-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEdit(blog)}
              className="flex-1 py-2.5 px-4 bg-white/50 dark:bg-white/10 text-neutral-700 dark:text-white rounded-2xl hover:bg-white dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm font-semibold border border-transparent hover:border-white/20 hover:shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDelete(blog)}
              className="flex-1 py-2.5 px-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-semibold border border-transparent hover:shadow-lg hover:shadow-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AquaInnerProductBlog = () => {
  const { showToast } = useToast();
  const location = useLocation();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  useEffect(() => {
    if (!hasBlogPrefill()) return;

    setSelectedBlog(null);
    setShowModal(true);
  }, [location.search, location.hash]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = (await blogService.getAllBlogs()) as {
        data?: unknown;
        error?: string;
      };
      if (res?.error) throw new Error(res.error);
      const body = res?.data as
        Blog[] | { data?: unknown; blogs?: unknown } | undefined;
      const list: Blog[] | null = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? (body.data as Blog[])
          : Array.isArray(body?.blogs)
            ? (body.blogs as Blog[])
            : null;
      const fallback = list ? [] : extractArrayPayload<Blog>(body);
      if (!list && fallback.length === 0) {
        throw new Error("Unexpected blog response. Please retry.");
      }
      setBlogs(list || fallback);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch blogs",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (blog: Blog) => {
    setBlogToDelete(blog);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!blogToDelete || deleting) return;
    setDeleting(true);

    try {
      const result = (await blogService.deleteBlog(blogToDelete._id)) as {
        error?: string;
      };
      if (result?.error) throw new Error(result.error);
      const deletedId = blogToDelete._id;
      setBlogs((previous) => previous.filter((blog) => blog._id !== deletedId));
      showToast("Blog deleted", "success");
      setShowDeleteModal(false);
      setBlogToDelete(null);
    } catch (error) {
      console.error("Failed to delete blog:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to delete blog",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (blog: Blog) => {
    setSelectedBlog(blog);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedBlog(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (data: any) => {
    const response = selectedBlog
      ? await blogService.updateBlog(selectedBlog._id, data)
      : await blogService.addBlog(data);

    if (response.error) {
      const details = Array.isArray(response.errors)
        ? response.errors
            .map((item: any) =>
              [item?.field, item?.message].filter(Boolean).join(": "),
            )
            .filter(Boolean)
        : [];
      const message = [response.error, ...details].join(" • ");
      showToast(message || "Failed to save blog", "error");
      throw new Error(message || "Failed to save blog");
    }

    showToast(selectedBlog ? "Blog updated" : "Blog created", "success");
    await fetchBlogs();
    setShowModal(false);
  };

  if (loading && blogs.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950 dark:text-white mb-2">
            Product Blogs
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Manage your product related articles and guides
          </p>
        </div>
        <LiquidButton type="button" variant="primary" onClick={handleCreate}>
          Create New Blog
        </LiquidButton>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300"
        >
          <span className="flex-1">{error}</span>
          <LiquidButton
            type="button"
            variant="soft"
            onClick={() => void fetchBlogs()}
            disabled={loading}
          >
            Retry
          </LiquidButton>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {blogs.map((blog) => (
            <motion.div
              key={blog._id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <BlogCard
                blog={blog}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {blogs.length === 0 && !loading && !error && (
        <div className="text-center py-20">
          <p className="text-neutral-400">
            No blogs found. Create one to get started.
          </p>
        </div>
      )}

      <BlogFormDialog
        show={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedBlog}
      />

      <BlogDeleteDialog
        show={showDeleteModal}
        loading={deleting}
        onClose={() => {
          if (!deleting) setShowDeleteModal(false);
        }}
        onConfirm={confirmDelete}
        blogTitle={blogToDelete?.title || ""}
      />
    </div>
  );
};

export default AquaInnerProductBlog;
