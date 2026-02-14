// @ts-nocheck
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Calendar,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface Intern {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  hire_date: string;
  employment_status: string;
  user_id: string | null;
  engagement?: {
    id: string;
    current_stage: string;
    current_title: string;
    start_date: string;
  };
  tasks_completed: number;
  tasks_total: number;
  deliverables_pending: number;
  latest_review_rating: number | null;
}

interface DashboardStats {
  total_interns: number;
  active_interns: number;
  at_risk: number;
  pending_reviews: number;
  pending_deliverables: number;
}

const ManagerDashboard: React.FC = () => {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_interns: 0,
    active_interns: 0,
    at_risk: 0,
    pending_reviews: 0,
    pending_deliverables: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch interns managed by this user
      const { data: employees, error } = await supabase
        .from("employees")
        .select("*")
        .eq("employment_type", "intern")
        .eq("employment_status", "active");

      if (error) throw error;

      // Fetch engagement data for each intern
      const internsWithData: Intern[] = await Promise.all(
        (employees || []).map(async (emp) => {
          // Get engagement
          const { data: engagement } = await supabase
            .from("promotion_engagements")
            .select("id, current_stage, current_title, start_date")
            .eq("person_id", emp.id)
            .single();

          // Get task stats
          const { data: tasks } = await supabase
            .from("intern_tasks")
            .select("status")
            .eq("intern_user_id", emp.user_id || "");

          const tasksCompleted = tasks?.filter(t => t.status === "completed").length || 0;
          const tasksTotal = tasks?.length || 0;

          // Get pending deliverables
          const { data: deliverables } = await supabase
            .from("intern_deliverables")
            .select("status")
            .eq("intern_user_id", emp.user_id || "")
            .in("status", ["submitted", "in_review"]);

          // Get latest review
          const { data: review } = await supabase
            .from("promotion_performance_reviews")
            .select("rating")
            .eq("engagement_id", engagement?.id || "")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...emp,
            engagement: engagement || undefined,
            tasks_completed: tasksCompleted,
            tasks_total: tasksTotal,
            deliverables_pending: deliverables?.length || 0,
            latest_review_rating: review?.rating || null,
          };
        })
      );

      setInterns(internsWithData);

      // Calculate stats
      const atRisk = internsWithData.filter(i => 
        (i.latest_review_rating !== null && i.latest_review_rating < 60) ||
        (i.tasks_total > 0 && (i.tasks_completed / i.tasks_total) < 0.5)
      ).length;

      setStats({
        total_interns: internsWithData.length,
        active_interns: internsWithData.filter(i => i.employment_status === "active").length,
        at_risk: atRisk,
        pending_reviews: internsWithData.filter(i => i.deliverables_pending > 0).length,
        pending_deliverables: internsWithData.reduce((sum, i) => sum + i.deliverables_pending, 0),
      });

    } catch (error) {
      console.error("Error fetching interns:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndicator = (intern: Intern) => {
    // Red: At risk (low rating or low task completion)
    if (intern.latest_review_rating !== null && intern.latest_review_rating < 60) {
      return { color: "#ef4444", label: "At Risk", icon: AlertTriangle };
    }
    if (intern.tasks_total > 0 && (intern.tasks_completed / intern.tasks_total) < 0.5) {
      return { color: "#f59e0b", label: "Behind", icon: Clock };
    }
    // Green: On track
    return { color: "#22c55e", label: "On Track", icon: CheckCircle };
  };

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
            Intern Manager Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            Roster, status, and risk flags for your assigned interns
          </p>
        </div>
        <button
          onClick={fetchInterns}
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
        <StatCard title="Total Interns" value={stats.total_interns} icon={Users} color="#3b82f6" />
        <StatCard title="Active" value={stats.active_interns} icon={CheckCircle} color="#22c55e" />
        <StatCard title="At Risk" value={stats.at_risk} icon={AlertTriangle} color="#ef4444" />
        <StatCard title="Pending Reviews" value={stats.pending_deliverables} icon={FileText} color="#f59e0b" />
      </div>

      {/* Intern Roster */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>Intern Roster</h2>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>{interns.length} interns</span>
        </div>

        {interns.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <Users size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
            <p style={{ fontSize: "14px", color: "#6b7280" }}>No interns assigned yet</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Intern
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Position
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Stage
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Tasks
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Rating
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Start Date
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern, index) => {
                  const status = getStatusIndicator(intern);
                  const StatusIcon = status.icon;
                  return (
                    <tr
                      key={intern.id}
                      style={{
                        borderBottom: index < interns.length - 1 ? "1px solid #e5e7eb" : "none",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedIntern(intern)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "16px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 10px",
                            backgroundColor: `${status.color}15`,
                            borderRadius: "16px",
                            width: "fit-content",
                          }}
                        >
                          <StatusIcon size={14} color={status.color} />
                          <span style={{ fontSize: "12px", fontWeight: 500, color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                            {intern.first_name} {intern.last_name}
                          </p>
                          <p style={{ fontSize: "12px", color: "#6b7280" }}>{intern.email}</p>
                        </div>
                      </td>
                      <td style={{ padding: "16px", fontSize: "14px", color: "#374151" }}>
                        {intern.position}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 500,
                            padding: "4px 8px",
                            backgroundColor: "#e0e7ff",
                            color: "#4338ca",
                            borderRadius: "4px",
                          }}
                        >
                          {intern.engagement?.current_stage?.replace(/_/g, " ") || "N/A"}
                        </span>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "80px",
                              height: "6px",
                              backgroundColor: "#e5e7eb",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${intern.tasks_total > 0 ? (intern.tasks_completed / intern.tasks_total) * 100 : 0}%`,
                                height: "100%",
                                backgroundColor: "#22c55e",
                                borderRadius: "3px",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "12px", color: "#6b7280" }}>
                            {intern.tasks_completed}/{intern.tasks_total}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        {intern.latest_review_rating !== null ? (
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: intern.latest_review_rating >= 70 ? "#22c55e" : intern.latest_review_rating >= 50 ? "#f59e0b" : "#ef4444",
                            }}
                          >
                            {intern.latest_review_rating}%
                          </span>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#9ca3af" }}>No review</span>
                        )}
                      </td>
                      <td style={{ padding: "16px", fontSize: "13px", color: "#6b7280" }}>
                        {formatDate(intern.hire_date)}
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <button
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#f3f4f6",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            color: "#374151",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          View <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intern Detail Modal */}
      {selectedIntern && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setSelectedIntern(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              margin: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                {selectedIntern.first_name} {selectedIntern.last_name}
              </h3>
              <button
                onClick={() => setSelectedIntern(null)}
                style={{
                  padding: "8px",
                  backgroundColor: "#f3f4f6",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Position</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{selectedIntern.position}</p>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Stage</p>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                    {selectedIntern.engagement?.current_stage?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>
              </div>

              <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Task Progress</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      flex: 1,
                      height: "8px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${selectedIntern.tasks_total > 0 ? (selectedIntern.tasks_completed / selectedIntern.tasks_total) * 100 : 0}%`,
                        height: "100%",
                        backgroundColor: "#22c55e",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                    {selectedIntern.tasks_completed}/{selectedIntern.tasks_total}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Latest Rating</p>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: selectedIntern.latest_review_rating !== null ? (selectedIntern.latest_review_rating >= 70 ? "#22c55e" : "#f59e0b") : "#9ca3af" }}>
                    {selectedIntern.latest_review_rating !== null ? `${selectedIntern.latest_review_rating}%` : "N/A"}
                  </p>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Pending Reviews</p>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                    {selectedIntern.deliverables_pending}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#ff5f1f",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Create Review
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  View Tasks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
