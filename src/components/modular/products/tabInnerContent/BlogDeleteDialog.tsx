import CatalogDeleteDialog from "../CatalogDeleteDialog";

interface BlogDeleteDialogProps {
  show: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  blogTitle: string;
}

const BlogDeleteDialog = ({
  show,
  loading = false,
  onClose,
  onConfirm,
  blogTitle,
}: BlogDeleteDialogProps) => (
  <CatalogDeleteDialog
    open={show}
    loading={loading}
    onClose={onClose}
    onConfirm={onConfirm}
    title="Delete Blog?"
    widthStorageKey="aquacrm:blog-delete-width"
    message={
      <p>
        Are you sure you want to delete{" "}
        <span className="font-bold text-white">"{blogTitle}"</span>?
      </p>
    }
  />
);

export default BlogDeleteDialog;
