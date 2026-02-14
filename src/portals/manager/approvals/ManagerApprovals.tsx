// @ts-nocheck
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckSquare,
  FileCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Send,
  X,
} from "lucide-react";

interface Deliverable {
  id: string;
  task_id: string | null;
  intern_user_id: string;
  title: string;
  description: string | null;
  deliverable_type: string;
  status: string;
  submission_url: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  intern_name?: string;
  intern_email?: string;
  task_title?: string;
}

interface ConversionCandidate {
  id: string;
  engagement_id: string;
  intern_name: string;
  intern_position: string;
  current_stage: string;
  avg_rating: number;
  weeks_active: number;
  deliverables_approved: number;
  recommendation: string | null;
}

const ManagerApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"deliverables" | "conversions">("deliverables");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [conversions, setConversions] = useState<ConversionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending deliverables
      const { data: delivData } = await supabase
        .from("intern_deliverables")
        .select("*")
        .in("status", ["submitted", "in_review"])
        .order("submitted_at", { ascending: true });

      // Enrich with intern and task info
      const enrichedDeliverables: Deliverable[] = await Promise.all(
        (delivData || []).map(async (deliv) => {
          // Get intern info from auth
          let internName = "Unknown";
          let internEmail = "";

          // Try to get employee info via user_id
          const { data: employee } = await supabase
            .from("employees")
            .select("first_name, last_name, email")
            .eq("user_id", deliv.intern_user_id)
            .maybeSingle();

          if (employee) {
            internName = `${employee.first_name} ${employee.last_name}`;
            internEmail = employee.email;
          }

          // Get task title if linked
          let taskTitle = "";
          if (deliv.task_id) {
            const { data: task } = await supabase
              .from("intern_tasks")
              .select("title")
              .eq("id", deliv.task_id)
              .maybeSingle();
            taskTitle = task?.title || "";
          }

          return {
            ...deliv,
            intern_name: internName,
            intern_email: internEmail,
            task_title: taskTitle,
          };
        })
      );

      setDeliverables(enrichedDeliverables);

      // Fetch conversion candidates (interns with high ratings)
      const { data: engagements } = await supabase
        .from("promotion_engagements")
        .select("*")
        .in("current_stage", ["INTERN_ACTIVE", "ACTING_ELIGIBLE"]);

      const candidates: ConversionCandidate[] = await Promise.all(
        (engagements || []).map(async (eng) => {
          // Get employee info
          const { data: employee } = await supabase
            .from("employees")
            .select("first_name, last_name, position")
            .eq("id", eng.person_id)
            .maybeSingle();

          // Get average rating
          const { data: reviews } = await supabase
            .from("promotion_performance_reviews")
            .select("rating, recommendation")
            .eq("engagement_id", eng.id);

          const avgRating = reviews && reviews.length > 0
            ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
            : 0;

          const latestRec = reviews && reviews.length > 0
            ? reviews[reviews.length - 1].recommendation
            : null;

          // Calculate weeks active
          const startDate = new Date(eng.start_date);
          const weeksActive = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

          // Count approved deliverables
          const { count } = await supabase
            .from("intern_deliverables")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved");

          return {
            id: eng.id,
            engagement_id: eng.id,
            intern_name: employee ? `${employee.first_name} ${employee.last_name}` : "Unknown",
            intern_position: employee?.position || "N/A",
            current_stage: eng.current_stage,
            avg_rating: avgRating,
            weeks_active: weeksActive,
            deliverables_approved: count || 0,
            recommendation: latestRec,
          };
        })
      );

      // Filter to only show eligible candidates (high performers)
      setConversions(candidates.filter(c => c.avg_rating >= 70 || c.current_stage === "ACTING_ELIGIBLE"));

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDeliverable = async (status: "approved" | "rejected" | "revision_requested") => {
    if (!selectedDeliverable) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: any = {
        status,
        reviewer_id: user?.id,
        reviewer_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      };

      if (status === "approved") {
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("intern_deliverables")
        .update(updateData)
        .eq("id", selectedDeliverable.id);

      if (error) throw error;

      setSelectedDeliverable(null);
      setReviewNotes("");
      fetchData();
    } catch (error) {
      console.error("Error updating deliverable:", error);
      alert("Failed to update deliverable");
    } finally {
      setProcessing(false);
    }
  };

  const handleRecommendConversion = async (engagementId: string, recommendation: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create a promotion request
      const { error } = await supabase.from("intern_promotion_requests").insert({
        engagement_id: engagementId,
        target_role_state: "ACTING_EXECUTIVE",
        requested_by: user?.id,
        manager_recommendation: recommendation,
        eligibility_status: recommendation === "promote" ? "eligible" : "not_eligible",
        eligibility_snapshot: {
          recommended_at: new Date().toISOString(),
          recommendation,
        },
      });

      if (error) throw error;

      alert(`Recommendation submitted: ${recommendation}`);
      fetchData();
    } catch (error) {
      console.error("Error submitting recommendation:", error);
      alert("Failed to submit recommendation");
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      submitted: { bg: "#fef3c7", text: "#d97706", icon: Clock },
      in_review: { bg: "#dbeafe", text: "#2563eb", icon: Eye },
      approved: { bg: "#dcfce7", text: "#16a34a", icon: CheckCircle },
      rejected: { bg: "#fee2e2", text: "#dc2626", icon: XCircle },
      revision_requested: { bg: "#fef3c7", text: "#d97706", icon: AlertTriangle },
    };
    return styles[status] || styles.submitted;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: "#ff5f1f" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
          Approvals
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Approve deliverables, recommend conversions, and document decisions
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        <button
          onClick={() => setActiveTab("deliverables")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "deliverables" ? "#ff5f1f" : "transparent",
            color: activeTab === "deliverables" ? "white" : "#6b7280",
            border: "none",
            borderRadius: "8px 8px 0 0",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FileCheck size={18} />
          Deliverables
          {deliverables.length > 0 && (
            <span
              style={{
                backgroundColor: activeTab === "deliverables" ? "rgba(255,255,255,0.3)" : "#ff5f1f",
                color: activeTab === "deliverables" ? "white" : "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {deliverables.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("conversions")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "conversions" ? "#ff5f1f" : "transparent",
            color: activeTab === "conversions" ? "white" : "#6b7280",
            border: "none",
            borderRadius: "8px 8px 0 0",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckSquare size={18} />
          Conversion Candidates
          {conversions.length > 0 && (
            <span
              style={{
                backgroundColor: activeTab === "conversions" ? "rgba(255,255,255,0.3)" : "#22c55e",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {conversions.length}
            </span>
          )}
        </button>
      </div>

      {/* Deliverables Tab */}
      {activeTab === "deliverables" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {deliverables.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "48px",
                textAlign: "center",
                border: "1px solid #e5e7eb",
              }}
            >
              <CheckCircle size={48} style={{ color: "#22c55e", marginBottom: "16px" }} />
              <p style={{ fontSize: "16px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
                All caught up!
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>No pending deliverables to review</p>
            </div>
          ) : (
            deliverables.map((deliv) => {
              const statusStyle = getStatusBadge(deliv.status);
              const StatusIcon = statusStyle.icon;

              return (
                <div
                  key={deliv.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        backgroundColor: statusStyle.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <StatusIcon size={24} color={statusStyle.text} />
                    </div>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                        {deliv.title}
                      </p>
                      <p style={{ fontSize: "13px", color: "#6b7280" }}>
                        {deliv.intern_name} • {deliv.deliverable_type}
                        {deliv.task_title && ` • Task: ${deliv.task_title}`}
                      </p>
                      <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                        Submitted {formatDate(deliv.submitted_at)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {deliv.status.replace(/_/g, " ")}
                    </span>
                    <button
                      onClick={() => setSelectedDeliverable(deliv)}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#ff5f1f",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      Review <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Conversions Tab */}
      {activeTab === "conversions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {conversions.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "48px",
                textAlign: "center",
                border: "1px solid #e5e7eb",
              }}
            >
              <AlertTriangle size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
              <p style={{ fontSize: "16px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
                No conversion candidates
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Interns need higher performance ratings to be eligible
              </p>
            </div>
          ) : (
            conversions.map((candidate) => (
              <div
                key={candidate.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                      {candidate.intern_name}
                    </p>
                    <p style={{ fontSize: "13px", color: "#6b7280" }}>
                      {candidate.intern_position} • {candidate.weeks_active} weeks active
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor: candidate.current_stage === "ACTING_ELIGIBLE" ? "#dcfce7" : "#e0e7ff",
                      color: candidate.current_stage === "ACTING_ELIGIBLE" ? "#16a34a" : "#4338ca",
                      borderRadius: "16px",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    {candidate.current_stage.replace(/_/g, " ")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: candidate.avg_rating >= 70 ? "#22c55e" : "#f59e0b" }}>
                      {candidate.avg_rating}%
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>Avg Rating</p>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>
                      {candidate.weeks_active}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>Weeks</p>
                  </div>
                  <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>
                      {candidate.deliverables_approved}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>Approved</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleRecommendConversion(candidate.engagement_id, "promote")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ThumbsUp size={16} />
                    Recommend Promotion
                  </button>
                  <button
                    onClick={() => handleRecommendConversion(candidate.engagement_id, "extend")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Clock size={16} />
                    Extend Period
                  </button>
                  <button
                    onClick={() => handleRecommendConversion(candidate.engagement_id, "exit")}
                    style={{
                      padding: "10px 16px",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Deliverable Review Modal */}
      {selectedDeliverable && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "16px",
          }}
          onClick={() => setSelectedDeliverable(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>Review Deliverable</h3>
              <button
                onClick={() => setSelectedDeliverable(null)}
                style={{
                  padding: "8px",
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
                  {selectedDeliverable.title}
                </h4>
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                  {selectedDeliverable.description || "No description provided"}
                </p>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#9ca3af" }}>
                  <span>By: {selectedDeliverable.intern_name}</span>
                  <span>Type: {selectedDeliverable.deliverable_type}</span>
                </div>
              </div>

              {selectedDeliverable.submission_url && (
                <div style={{ marginBottom: "20px" }}>
                  <a
                    href={selectedDeliverable.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 16px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "14px",
                    }}
                  >
                    <Eye size={16} />
                    View Submission
                  </a>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add feedback for the intern..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleReviewDeliverable("approved")}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: processing ? "not-allowed" : "pointer",
                    opacity: processing ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
                <button
                  onClick={() => handleReviewDeliverable("revision_requested")}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: processing ? "not-allowed" : "pointer",
                    opacity: processing ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <MessageSquare size={16} />
                  Request Revision
                </button>
                <button
                  onClick={() => handleReviewDeliverable("rejected")}
                  disabled={processing}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#fee2e2",
                    color: "#dc2626",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: processing ? "not-allowed" : "pointer",
                    opacity: processing ? 0.7 : 1,
                  }}
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovals;
