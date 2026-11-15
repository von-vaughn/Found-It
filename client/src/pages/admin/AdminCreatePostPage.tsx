import { useNavigate } from "react-router-dom";
import { CreatePostForm } from "@/components/school_user/CreatePostForm";
import { paths } from "@/routes/paths";
import { AdminLayout } from "./AdminLayout";

export function AdminCreatePostPage() {
  const navigate = useNavigate();

  return (
    <AdminLayout activeSection="post">
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
