import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CreatePostForm } from "@/components/school_user/CreatePostForm";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

export function AdminCreatePostPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout activeSection="items">
      <div className="mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(paths.adminItems)}
          className="-ml-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to item reports
        </button>

        <header className="mt-3 mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Post an item lost or found
          </h1>
        </header>

        <CreatePostForm
          active
          onAddItem={() => {}}
          onSubmitted={() => navigate(paths.adminItems)}
          initialType="lost"
        />
      </div>
    </AdminLayout>
  );
}

export default AdminCreatePostPage;
