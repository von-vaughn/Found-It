import { useNavigate } from "react-router-dom";
import { CreatePostForm } from "@/components/school_user/CreatePostForm";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

export function AdminCreatePostPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout activeSection="post">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Post an item lost or found
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
          Create a lost or found report so campus users can search for the item,
          claim it, or return it to its owner.
        </p>
      </header>
      <CreatePostForm
        active
        onAddItem={() => {}}
        onSubmitted={() => navigate(paths.adminItems)}
        initialType="lost"
      />
    </AdminLayout>
  );
}

export default AdminCreatePostPage;
