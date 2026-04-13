import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const AdminViewAsUserBanner = () => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3 text-sm">
      <span>You are viewing as a regular user.</span>
      <Link to="/admin" className="flex items-center gap-1 font-semibold hover:underline">
        Back to Admin <ArrowRight size={14} />
      </Link>
    </div>
  );
};

export default AdminViewAsUserBanner;
