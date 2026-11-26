import { useNavigate } from "react-router-dom";
import { FadeIn } from "@/components/FadeIn";
import { CreatePostForm } from "@/components/school_user/CreatePostForm";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

export function AdminCreatePostPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout activeSection="post">
      <FadeIn>
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
            Post an item lost or found
          </h1>
        </header>
      </FadeIn>
      <FadeIn delay={0.05}>
        <CreatePostForm
          active
          onAddItem={() => {}}
          onSubmitted={() => navigate(paths.adminItems)}
          initialType="lost"
        />
      </FadeIn>
    </AdminLayout>
  );
}

export default AdminCreatePostPage;
