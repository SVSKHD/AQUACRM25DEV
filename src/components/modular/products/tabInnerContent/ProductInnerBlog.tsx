import { useState, useEffect } from "react";
import { blogService } from "../../../../services/apiService";
import { Edit2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BlogFormDialog from "./BlogFormDialog";
import BlogDeleteDialog from "./BlogDeleteDialog";

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
              "https://via.placeholder.com/300"
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
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await blogService.getAllBlogs();
      setBlogs(res?.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (blog: Blog) => {
    setBlogToDelete(blog);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!blogToDelete) return;

    try {
      await blogService.deleteBlog(blogToDelete._id);
      setBlogs(blogs.filter((blog) => blog._id !== blogToDelete._id));
      setShowDeleteModal(false);
      setBlogToDelete(null);
    } catch (error) {
      console.error("Failed to delete blog:", error);
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
    try {
      if (selectedBlog) {
        // Update existing
        await blogService.updateBlog(selectedBlog._id, data);
      } else {
        // Create new
        await blogService.addBlog(data);
      }
      await fetchBlogs(); // Refresh list
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save blog:", error);
      // Ideally show a toast here
    }
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
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-neutral-950 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Create New Blog
        </button>
      </div>

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

      {blogs.length === 0 && !loading && (
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
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        blogTitle={blogToDelete?.title || ""}
      />
    </div>
  );
};

export default AquaInnerProductBlog;
