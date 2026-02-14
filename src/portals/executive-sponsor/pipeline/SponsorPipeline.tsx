// @ts-nocheck
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  ChevronRight,
  RefreshCw,
  Filter,
  BarChart3,
  Calendar,
  Award,
  Target,
} from "lucide-react";

interface PipelineCandidate {
  id: string;
  engagement_id: string;
  person_id: string;
  intern_name: string;
  intern_email: string;
  position: string;
  track: string | null;
  current_stage: string;
  start_date: string;
  weeks_active: number;
  avg_rating: number;
  total_reviews: number;
  latest_recommendation: string | null;
  deliverables_approved: number;
  deliverables_pending: number;
  tasks_completed: number;
  tasks_total: number;
  risk_flags: string[];
  eligibility_score: number;
}

interface PipelineStats {
  total_candidates: number;
  eligible_for_promotion: number;
  at_risk: number;
  pending_reviews: number;
}

const SponsorPipeline: React.FC = () => {
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([]);
  const [stats, setStats] = useState<PipelineStats>({
    total_candidates: 0,
    eligible_for_promotion: 0,
    at_risk: 0,
    pending_reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "eligible" | "at_risk" | "in_progress">("all");
  const [sortBy, setSortBy] = useState<"rating" | "weeks" | "name">("rating");
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineCandidate | null>(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      // Fetch all intern engagements
      const { data: engagements } = await supabase
        .from("promotion_engagements")
        .select("*")
        .in("current_stage", ["INTERN_ACTIVE", "ACTING_ELIGIBLE", "ACTING_ACTIVE"]);

      const pipelineCandidates: PipelineCandidate[] = await Promise.all(
        (engagements || []).map(async (eng) => {
          // Get employee info
          const { data: employee } = await supabase
            .from("employees")
            .select("first_name, last_name, email, position, user_id")
            .eq("id", eng.person_id)
            .maybeSingle();

          // Get performance reviews
          const { data: reviews } = await supabase
            .from("promotion_performance_reviews")
            .select("rating, recommendation")
            .eq("engagement_id", eng.id)
            .order("created_at", { ascending: false });

          const avgRating = reviews && reviews.length > 0
            ? Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
            : 0;

          const latestRec = reviews && reviews.length > 0 ? reviews[0].recommendation : null;

          // Calculate weeks active
          const startDate = new Date(eng.start_date);
          const weeksActive = Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

          // Get deliverable counts
          const { data: deliverables } = await supabase
            .from("intern_deliverables")
            .select("status")
            .eq("intern_user_id", employee?.user_id || "");

          const deliverablesApproved = deliverables?.filter(d => d.status === "approved").length || 0;
          const deliverablesPending = deliverables?.filter(d => ["submitted", "in_review"].includes(d.status)).length || 0;

          // Get task counts
          const { data: tasks } = await supabase
            .from("intern_tasks")
            .select("status")
            .eq("intern_user_id", employee?.user_id || "");

          const tasksCompleted = tasks?.filter(t => t.status === "completed").length || 0;
          const tasksTotal = tasks?.length || 0;

          // Calculate risk flags
          const riskFlags: string[] = [];
          if (avgRating < 50) riskFlags.push("Low Performance");
          if (weeksActive > 12 && eng.current_stage === "INTERN_ACTIVE") riskFlags.push("Extended Internship");
          if (tasksTotal > 0 && (tasksCompleted / tasksTotal) < 0.3) riskFlags.push("Low Task Completion");
          if (reviews && reviews.length === 0 && weeksActive > 2) riskFlags.push("No Reviews");

          // Calculate eligibility score (0-100)
          let eligibilityScore = 0;
          if (avgRating >= 70) eligibilityScore += 40;
          else if (avgRating >= 50) eligibilityScore += 20;
          if (weeksActive >= 8) eligibilityScore += 20;
          if (deliverablesApproved >= 3) eligibilityScore += 20;
          if (tasksTotal > 0 && (tasksCompleted / tasksTotal) >= 0.7) eligibilityScore += 20;

          return {
            id: eng.id,
            engagement_id: eng.id,
            person_id: eng.person_id,
            intern_name: employee ? `${employee.first_name} ${employee.last_name}` : "Unknown",
            intern_email: employee?.email || "",
            position: employee?.position || "N/A",
            track: eng.track,
            current_stage: eng.current_stage,
            start_date: eng.start_date,
            weeks_active: weeksActive,
            avg_rating: avgRating,
            total_reviews: reviews?.length || 0,
            latest_recommendation: latestRec,
            deliverables_approved: deliverablesApproved,
            deliverables_pending: deliverablesPending,
            tasks_completed: tasksCompleted,
            tasks_total: tasksTotal,
            risk_flags: riskFlags,
            eligibility_score: eligibilityScore,
          };
        })
      );

      setCandidates(pipelineCandidates);

      // Calculate stats
      setStats({
        total_candidates: pipelineCandidates.length,
        eligible_for_promotion: pipelineCandidates.filter(c => c.eligibility_score >= 80).length,
        at_risk: pipelineCandidates.filter(c => c.risk_flags.length > 0).length,
        pending_reviews: pipelineCandidates.filter(c => c.deliverables_pending > 0).length,
      });

    } catch (error) {
      console.error("Error fetching pipeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "ACTING_ELIGIBLE":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "ACTING_ACTIVE":
        return { bg: "#dbeafe", text: "#2563eb" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const getEligibilityColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const filteredCandidates = candidates
    .filter((c) => {
      if (filter === "eligible") return c.eligibility_score >= 80;
      if (filter === "at_risk") return c.risk_flags.length > 0;
      if (filter === "in_progress") return c.current_stage === "INTERN_ACTIVE";
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return b.avg_rating - a.avg_rating;
      if (sortBy === "weeks") return b.weeks_active - a.weeks_active;
      return a.intern_name.localeCompare(b.intern_name);
    });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>{title}</p>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "#111827" }}>{value}</p>
        </div>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={24} color={color} />
        </div>
      </div>
    </div>
  );

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
            Intern Conversion Pipeline
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            View all interns approaching eligibility for Acting Executive
          </p>
        </div>
        <button
          onClick={fetchPipeline}
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
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <StatCard title="Total in Pipeline" value={stats.total_candidates} icon={Users} color="#3b82f6" />
        <StatCard title="Eligible for Promotion" value={stats.eligible_for_promotion} icon={Award} color="#22c55e" />
        <StatCard title="At Risk" value={stats.at_risk} icon={AlertTriangle} color="#ef4444" />
        <StatCard title="Pending Reviews" value={stats.pending_reviews} icon={Clock} color="#f59e0b" />
      </div>

      {/* Filters and Sort */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "all", label: "All" },
            { key: "eligible", label: "Eligible" },
            { key: "at_risk", label: "At Risk" },
            { key: "in_progress", label: "In Progress" },
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={16} color="#6b7280" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "13px",
              backgroundColor: "white",
            }}
          >
            <option value="rating">Sort by Rating</option>
            <option value="weeks">Sort by Tenure</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filteredCandidates.length === 0 ? (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "48px",
              textAlign: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            <Users size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
            <p style={{ fontSize: "14px", color: "#6b7280" }}>No candidates match your filters</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const stageColor = getStageColor(candidate.current_stage);
            const eligColor = getEligibilityColor(candidate.eligibility_score);

            return (
              <div
                key={candidate.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      {/* Eligibility Score Circle */}
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          border: `4px solid ${eligColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                        }}
                      >
                        <span style={{ fontSize: "18px", fontWeight: 700, color: eligColor }}>
                          {candidate.eligibility_score}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                          {candidate.intern_name}
                        </p>
                        <p style={{ fontSize: "13px", color: "#6b7280" }}>
                          {candidate.position} • {candidate.track || "General"}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                          Started {formatDate(candidate.start_date)} • {candidate.weeks_active} weeks
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          backgroundColor: stageColor.bg,
                          color: stageColor.text,
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        {candidate.current_stage.replace(/_/g, " ")}
                      </span>
                      <button
                        onClick={() => setSelectedCandidate(candidate)}
                        style={{
                          padding: "8px",
                          backgroundColor: "#f3f4f6",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <ChevronRight size={25.4} color="#6b7280" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ padding: "10px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: candidate.avg_rating >= 70 ? "#22c55e" : candidate.avg_rating >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {candidate.avg_rating}%
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>Avg Rating</p>
                    </div>
                    <div style={{ padding: "10px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{candidate.total_reviews}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>Reviews</p>
                    </div>
                    <div style={{ padding: "10px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{candidate.deliverables_approved}</p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>Approved</p>
                    </div>
                    <div style={{ padding: "10px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                        {candidate.tasks_total > 0 ? Math.round((candidate.tasks_completed / candidate.tasks_total) * 100) : 0}%
                      </p>
                      <p style={{ fontSize: "11px", color: "#6b7280" }}>Tasks Done</p>
                    </div>
                  </div>

                  {/* Risk Flags */}
                  {candidate.risk_flags.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {candidate.risk_flags.map((flag, i) => (
                        <span
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            backgroundColor: "#fee2e2",
                            color: "#dc2626",
                            borderRadius: "16px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          <AlertTriangle size={12} />
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
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
          onClick={() => setSelectedCandidate(null)}
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
              }}
            >
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                  {selectedCandidate.intern_name}
                </h3>
                <p style={{ fontSize: "13px", color: "#6b7280" }}>{selectedCandidate.position}</p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              {/* Eligibility Score */}
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    border: `6px solid ${getEligibilityColor(selectedCandidate.eligibility_score)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                  }}
                >
                  <span style={{ fontSize: "28px", fontWeight: 700, color: getEligibilityColor(selectedCandidate.eligibility_score) }}>
                    {selectedCandidate.eligibility_score}
                  </span>
                </div>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Eligibility Score</p>
                <p style={{ fontSize: "13px", color: "#6b7280" }}>
                  {selectedCandidate.eligibility_score >= 80 ? "Ready for promotion" : selectedCandidate.eligibility_score >= 50 ? "Making progress" : "Needs improvement"}
                </p>
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Track</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{selectedCandidate.track || "General"}</p>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Current Stage</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{selectedCandidate.current_stage.replace(/_/g, " ")}</p>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Start Date</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{formatDate(selectedCandidate.start_date)}</p>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Weeks Active</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{selectedCandidate.weeks_active} weeks</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>Performance Metrics</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
                <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: selectedCandidate.avg_rating >= 70 ? "#22c55e" : "#f59e0b" }}>
                    {selectedCandidate.avg_rating}%
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Average Rating</p>
                </div>
                <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>{selectedCandidate.total_reviews}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Total Reviews</p>
                </div>
                <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>{selectedCandidate.deliverables_approved}</p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Deliverables Approved</p>
                </div>
                <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", textAlign: "center" }}>
                  <p style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>
                    {selectedCandidate.tasks_completed}/{selectedCandidate.tasks_total}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>Tasks Completed</p>
                </div>
              </div>

              {/* Risk Flags */}
              {selectedCandidate.risk_flags.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>Risk Flags</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCandidate.risk_flags.map((flag, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 12px",
                          backgroundColor: "#fee2e2",
                          borderRadius: "8px",
                        }}
                      >
                        <AlertTriangle size={16} color="#dc2626" />
                        <span style={{ fontSize: "14px", color: "#dc2626" }}>{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Recommendation */}
              {selectedCandidate.latest_recommendation && (
                <div style={{ padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Latest Manager Recommendation</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#16a34a" }}>
                    {selectedCandidate.latest_recommendation.replace(/_/g, " ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorPipeline;
