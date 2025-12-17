import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  Save,
  RefreshCw,
  X,
} from "lucide-react";

interface Review {
  id: string;
  engagement_id: string;
  period_start: string;
  period_end: string;
  kpi_json: any;
  rating: number;
  recommendation: string | null;
  reviewer_person_id: string | null;
  deliverables_complete: boolean;
  created_at: string;
  intern_name?: string;
  intern_position?: string;
}

interface Intern {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  engagement_id: string | null;
  user_id: string | null;
}

const ManagerReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // Form state
  const [selectedIntern, setSelectedIntern] = useState<string>("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [rating, setRating] = useState<number>(70);
  const [recommendation, setRecommendation] = useState<string>("HOLD");
  const [deliverablesComplete, setDeliverablesComplete] = useState(false);
  const [kpiScores, setKpiScores] = useState({
    quality: 70,
    timeliness: 70,
    communication: 70,
    initiative: 70,
    teamwork: 70,
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch interns
      const { data: employees } = await supabase
        .from("employees")
        .select("id, first_name, last_name, position, user_id")
        .eq("employment_type", "intern")
        .eq("employment_status", "active");

      // Get engagement IDs for interns
      const internsWithEngagements: Intern[] = await Promise.all(
        (employees || []).map(async (emp) => {
          const { data: engagement } = await supabase
            .from("promotion_engagements")
            .select("id")
            .eq("person_id", emp.id)
            .maybeSingle();

          return {
            ...emp,
            engagement_id: engagement?.id || null,
          };
        })
      );

      setInterns(internsWithEngagements);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("promotion_performance_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      // Enrich reviews with intern names
      const enrichedReviews: Review[] = await Promise.all(
        (reviewsData || []).map(async (review) => {
          const { data: engagement } = await supabase
            .from("promotion_engagements")
            .select("person_id")
            .eq("id", review.engagement_id)
            .maybeSingle();

          if (engagement?.person_id) {
            const { data: employee } = await supabase
              .from("employees")
              .select("first_name, last_name, position")
              .eq("id", engagement.person_id)
              .maybeSingle();

            return {
              ...review,
              intern_name: employee ? `${employee.first_name} ${employee.last_name}` : "Unknown",
              intern_position: employee?.position || "N/A",
            };
          }

          return {
            ...review,
            intern_name: "Unknown",
            intern_position: "N/A",
          };
        })
      );

      setReviews(enrichedReviews);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async () => {
    if (!selectedIntern || !periodStart || !periodEnd) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const intern = interns.find(i => i.id === selectedIntern);
      if (!intern?.engagement_id) {
        alert("Selected intern has no engagement record");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("promotion_performance_reviews").insert({
        engagement_id: intern.engagement_id,
        period_start: periodStart,
        period_end: periodEnd,
        rating,
        recommendation,
        deliverables_complete: deliverablesComplete,
        kpi_json: {
          scores: kpiScores,
          notes,
        },
        reviewer_person_id: user?.id,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating review:", error);
      alert("Failed to create review");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedIntern("");
    setPeriodStart("");
    setPeriodEnd("");
    setRating(70);
    setRecommendation("HOLD");
    setDeliverablesComplete(false);
    setKpiScores({
      quality: 70,
      timeliness: 70,
      communication: 70,
      initiative: 70,
      teamwork: 70,
    });
    setNotes("");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRecommendationColor = (rec: string | null) => {
    switch (rec) {
      case "PROMOTE_ACTING":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "EXTEND":
        return { bg: "#fef3c7", text: "#d97706" };
      case "EXIT":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === "pending") return review.rating < 70;
    if (filter === "completed") return review.rating >= 70;
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: "#ff5f1f" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
            Weekly Performance Reviews
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Create and finalize weekly reviews for your interns
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            backgroundColor: "#ff5f1f",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          New Review
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { key: "all", label: "All Reviews" },
          { key: "pending", label: "Needs Attention" },
          { key: "completed", label: "On Track" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: "8px 16px",
              backgroundColor: filter === tab.key ? "#ff5f1f" : "#f3f4f6",
              color: filter === tab.key ? "white" : "#6b7280",
              border: "none",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredReviews.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "48px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            <FileText size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
            <p style={{ fontSize: "14px", color: "#6b7280" }}>No reviews found</p>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const recColor = getRecommendationColor(review.recommendation);
            const isExpanded = expandedReview === review.id;

            return (
              <div
                key={review.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: review.rating >= 70 ? "#dcfce7" : review.rating >= 50 ? "#fef3c7" : "#fee2e2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        color: review.rating >= 70 ? "#16a34a" : review.rating >= 50 ? "#d97706" : "#dc2626",
                      }}
                    >
                      {review.rating}
                    </div>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                        {review.intern_name}
                      </p>
                      <p style={{ fontSize: "13px", color: "#6b7280" }}>
                        {review.intern_position} • {formatDate(review.period_start)} - {formatDate(review.period_end)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        backgroundColor: recColor.bg,
                        color: recColor.text,
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    >
                      {review.recommendation?.replace(/_/g, " ") || "PENDING"}
                    </span>
                    {isExpanded ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 20px 20px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ paddingTop: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                        {review.kpi_json?.scores && Object.entries(review.kpi_json.scores).map(([key, value]) => (
                          <div key={key} style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "capitalize" }}>
                              {key}
                            </p>
                            <p style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>{value as number}%</p>
                          </div>
                        ))}
                      </div>

                      {review.kpi_json?.notes && (
                        <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Notes</p>
                          <p style={{ fontSize: "14px", color: "#374151" }}>{review.kpi_json.notes}</p>
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "13px",
                            color: review.deliverables_complete ? "#16a34a" : "#d97706",
                          }}
                        >
                          {review.deliverables_complete ? <CheckCircle size={16} /> : <Clock size={16} />}
                          Deliverables {review.deliverables_complete ? "Complete" : "Pending"}
                        </span>
                        <span style={{ fontSize: "13px", color: "#9ca3af" }}>•</span>
                        <span style={{ fontSize: "13px", color: "#6b7280" }}>
                          Created {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Review Modal */}
      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "auto",
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
                position: "sticky",
                top: 0,
                backgroundColor: "white",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>Create Performance Review</h3>
              <button
                onClick={() => setShowCreateModal(false)}
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

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Intern Selection */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Select Intern *
                </label>
                <select
                  value={selectedIntern}
                  onChange={(e) => setSelectedIntern(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Choose an intern...</option>
                  {interns.filter(i => i.engagement_id).map((intern) => (
                    <option key={intern.id} value={intern.id}>
                      {intern.first_name} {intern.last_name} - {intern.position}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Period Start *
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Period End *
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {/* KPI Scores */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "12px" }}>
                  KPI Scores
                </label>
                <div style={{ display: "grid", gap: "12px" }}>
                  {Object.entries(kpiScores).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ width: "120px", fontSize: "14px", color: "#374151", textTransform: "capitalize" }}>
                        {key}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={value}
                        onChange={(e) =>
                          setKpiScores((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))
                        }
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: "50px", fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Rating */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Overall Rating: {rating}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Recommendation */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Recommendation
                </label>
                <select
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="HOLD">Hold - Continue Observation</option>
                  <option value="EXTEND">Extend - More Time Needed</option>
                  <option value="PROMOTE_ACTING">Promote to Acting Executive</option>
                  <option value="EXIT">Exit - End Internship</option>
                </select>
              </div>

              {/* Deliverables */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="deliverables"
                  checked={deliverablesComplete}
                  onChange={(e) => setDeliverablesComplete(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                <label htmlFor="deliverables" style={{ fontSize: "14px", color: "#374151" }}>
                  All deliverables complete for this period
                </label>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes or feedback..."
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
            </div>

            <div
              style={{
                padding: "20px",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                position: "sticky",
                bottom: 0,
                backgroundColor: "white",
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReview}
                disabled={saving}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ff5f1f",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {saving ? "Saving..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerReviews;
