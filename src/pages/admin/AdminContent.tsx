import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const AdminContent = () => {
  const { loading: authLoading } = useAdmin();
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    supabase.from("site_content").select("*").order("page").then(({ data }) => {
      setContent(data || []);
      const map: Record<string, string> = {};
      (data || []).forEach(c => { map[c.id] = c.content; });
      setEdits(map);
      setLoading(false);
    });
  }, [authLoading]);

  const save = async (item: any) => {
    await supabase.from("site_content").update({ content: edits[item.id], updated_at: new Date().toISOString() }).eq("id", item.id);
    toast.success(`${item.section} saved`);
  };

  if (authLoading || loading) return <AdminLayout><Loader2 className="animate-spin text-primary mx-auto mt-32" size={32} /></AdminLayout>;

  const grouped = content.reduce((acc: Record<string, any[]>, c) => {
    (acc[c.page] = acc[c.page] || []).push(c);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Content Management</h1>

      {Object.entries(grouped).map(([page, items]) => (
        <Card key={page} className="mb-6">
          <CardHeader><CardTitle className="text-base capitalize">{page}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(items as any[]).map((item: any) => (
              <div key={item.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">{item.section}</label>
                  {item.content.length > 80 ? (
                    <Textarea value={edits[item.id] || ""} onChange={(e) => setEdits({ ...edits, [item.id]: e.target.value })} rows={3} />
                  ) : (
                    <Input value={edits[item.id] || ""} onChange={(e) => setEdits({ ...edits, [item.id]: e.target.value })} />
                  )}
                </div>
                <Button size="sm" variant="outline" className="mt-5" onClick={() => save(item)}><Save size={14} /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </AdminLayout>
  );
};

export default AdminContent;
