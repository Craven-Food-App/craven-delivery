// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, Clock, AlertTriangle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

const DOC_TYPES = [
  { id: "courier_insurance", label: "Commercial Auto Insurance", required: true, note: "Required for activation." },
  { id: "business_license", label: "Business License", required: true, note: "" },
  { id: "w9", label: "W-9", required: true, note: "" },
  { id: "dot_authority", label: "DOT Authority", required: false, note: "Optional unless you operate interstate." },
] as const;

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-rose-100 text-rose-700",
  expired: "bg-rose-100 text-rose-700",
};

const STATUS_ICON: Record<string, any> = {
  approved: CheckCircle2,
  pending: Clock,
  rejected: XCircle,
  expired: AlertTriangle,
};

export function CXCourierDocumentsCard({ restaurantId }: { restaurantId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase
      .from("cx_courier_documents")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
  };

  useEffect(() => {
    if (restaurantId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const upload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const path = `courier/${restaurantId}/${docType}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("business-documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("business-documents").getPublicUrl(path);
      const { error } = await supabase.from("cx_courier_documents").insert({
        restaurant_id: restaurantId,
        uploaded_by: user.id,
        document_type: docType,
        file_url: pub.publicUrl,
        file_name: file.name,
        status: "pending",
        expires_at: expiry[docType] ? new Date(expiry[docType]).toISOString() : null,
      });
      if (error) throw error;
      toast.success("Uploaded — pending review");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const latestFor = (type: string) => docs.find((d) => d.document_type === type);

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold">Compliance documents</h2>
        <p className="text-sm text-slate-600">
          Upload commercial auto insurance, your business license, and W-9. Crave'N admins review within 1 business day.
          You can post jobs once insurance is approved.
        </p>
      </div>
      <div className="space-y-2">
        {DOC_TYPES.map((doc) => {
          const latest = latestFor(doc.id);
          const Status = latest ? STATUS_ICON[latest.status] ?? FileText : FileText;
          return (
            <div key={doc.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {doc.label}
                    {doc.required && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Required</span>
                    )}
                  </div>
                  {doc.note && <div className="text-xs text-slate-500 mt-0.5">{doc.note}</div>}
                  {latest?.expires_at && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Expires {new Date(latest.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                {latest && (
                  <Badge className={STATUS_STYLE[latest.status] ?? ""}>
                    <Status className="h-3 w-3 mr-1" />
                    {latest.status}
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1">
                  <Label className="text-xs">Expires (optional)</Label>
                  <Input
                    type="date"
                    value={expiry[doc.id] ?? ""}
                    onChange={(e) => setExpiry({ ...expiry, [doc.id]: e.target.value })}
                    className="h-9"
                  />
                </div>
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(doc.id, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading === doc.id}
                    onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploading === doc.id ? "Uploading…" : latest ? "Replace" : "Upload"}
                  </Button>
                </label>
              </div>
              {latest?.status === "rejected" && latest.rejection_reason && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">
                  Reviewer note: {latest.rejection_reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}