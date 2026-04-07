import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Report = () => {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <span className="text-2xl font-bold tracking-tight mb-8">
        <span className="text-foreground">Campo</span>
        <span className="text-primary">metric</span>
      </span>
      <h1 className="text-3xl font-bold text-foreground mb-4">Report coming soon</h1>
      <p className="text-muted-foreground mb-2">Session ID: {id}</p>
      <p className="text-muted-foreground mb-8">
        The report page will be built in a future update.
      </p>
      <Link to="/">
        <Button variant="outline">← Back to home</Button>
      </Link>
    </div>
  );
};

export default Report;
