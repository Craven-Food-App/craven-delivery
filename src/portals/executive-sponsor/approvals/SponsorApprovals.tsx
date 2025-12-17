import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Shield,
  Scale,
  Send,
  X,
} from "lucide-react";

interface PromotionRequest {
  id: string;
  engagement_id: string;
  target_role_state: string;
  requested_by: string;
  manager_recommendation: string | null;
  eligibility_snapshot: any;
  eligibility_status: string;
  status: string;
  sponsor_decision: string | null;
  sponsor_reason_code: string | null;
  sponsor_comment: string | null;
  decided_at: string | null;
  created_at: string;
  intern_name?: string;
  intern_position?: string;
  requester_name?: string;
}

interface EnforcementRequest {
  id: string;
  engagement_id: string;
  action_type: string;
  severity: string;
  requested_by: string;
  evidence_links: string[];
  reason: string;
  recommended_duration: number | null;
  status: string;
  sponsor_reason_code: string | null;
  sponsor_comment: string | null;
  decided_at: string | null;
  created_at: string;
  intern_name?: string;
  intern_position?: string;
  requester_name?: string;
}

const SponsorApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"promotions" | "enforcement">("promotions");
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [enforcementRequests, setEnforcementRequests] = useState<EnforcementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PromotionRequest | EnforcementRequest | null>(null);
  const [requestType, setRequestType] = useState<"promotion" | "enforcement">("promotion");
  const [decision, setDecision] = useState<string>("");
  const [reasonCode, setReasonCode] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Fetch promotion requests
      const { data: promoData } = await supabase
        .from("intern_promotion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const enrichedPromos: PromotionRequest[] = await Promise.all(
        (promoData || []).map(async (req) => {
          // Get intern info via engagement
          const { data: engagement } = await supabase
            .from("promotion_engagements")
            .select("person_id")
            .eq("id", req.engagement_id)
            .maybeSingle();

          let internName = "Unknown";
          let internPosition = "N/A";

          if (engagement?.person_id) {
            const { data: employee } = await supabase
              .from("employees")
              .select("first_name, last_name, position")
              .eq("id", engagement.person_id)
              .maybeSingle();

            if (employee) {
              internName = `${employee.first_name} ${employee.last_name}`;
              internPosition = employee.position;
            }
          }

          return {
            ...req,
            intern_name: internName,
            intern_position: internPosition,
          };
        })
      );

      setPromotionRequests(enrichedPromos);

      // Fetch enforcement requests
      const { data: enfData } = await supabase
        .from("intern_enforcement_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const enrichedEnforcement: EnforcementRequest[] = await Promise.all(
        (enfData || []).map(async (req) => {
          // Get intern info via engagement
          const { data: engagement } = await supabase
            .from("promotion_engagements")
            .select("person_id")
            .eq("id", req.engagement_id)
            .maybeSingle();

          let internName = "Unknown";
          let internPosition = "N/A";

          if (engagement?.person_id) {
            const { data: employee } = await supabase
              .from("employees")
              .select("first_name, last_name, position")
              .eq("id", engagement.person_id)
              .maybeSingle();

            if (employee) {
              internName = `${employee.first_name} ${employee.last_name}`;
              internPosition = employee.position;
            }
          }

          return {
            ...req,
            intern_name: internName,
            intern_position: internPosition,
          };
        })
      );

      setEnforcementRequests(enrichedEnforcement);

    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!selectedRequest || !decision) {
      alert("Please select a decision");
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (requestType === "promotion") {
        const { error } = await supabase
          .from("intern_promotion_requests")
          .update({
            status: decision,
            sponsor_id: user?.id,
            sponsor_decision: decision,
            sponsor_reason_code: reasonCode || null,
            sponsor_comment: comment || null,
            decided_at: new Date().toISOString(),
          })
          .eq("id", selectedRequest.id);

        if (error) throw error;

        // If approved, update the engagement stage
        if (decision === "approved") {
          const promoReq = selectedRequest as PromotionRequest;
          await supabase
            .from("promotion_engagements")
            .update({ current_stage: "ACTING_ACTIVE" })
            .eq("id", promoReq.engagement_id);
        }
      } else {
        const { error } = await supabase
          .from("intern_enforcement_requests")
          .update({
            status: decision,
            sponsor_id: user?.id,
            sponsor_reason_code: reasonCode || null,
            sponsor_comment: comment || null,
            decided_at: new Date().toISOString(),
          })
          .eq("id", selectedRequest.id);

        if (error) throw error;

        // If approved enforcement, update engagement based on action type
        if (decision === "approved") {
          const enfReq = selectedRequest as EnforcementRequest;
          if (enfReq.action_type === "exit") {
            await supabase
              .from("promotion_engagements")
              .update({ current_stage: "EXITED", end_date: new Date().toISOString().split("T")[0] })
              .eq("id", enfReq.engagement_id);
          }
        }
      }

      setSelectedRequest(null);
      setDecision("");
      setReasonCode("");
      setComment("");
      fetchRequests();
    } catch (error) {
      console.error("Error processing decision:", error);
      alert("Failed to process decision");
    } finally {
      setProcessing(false);
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
      pending: { bg: "#fef3c7", text: "#d97706", icon: Clock },
      approved: { bg: "#dcfce7", text: "#16a34a", icon: CheckCircle },
      denied: { bg: "#fee2e2", text: "#dc2626", icon: XCircle },
      deferred: { bg: "#e0e7ff", text: "#4338ca", icon: Clock },
      more_info_requested: { bg: "#fef3c7", text: "#d97706", icon: MessageSquare },
    };
    return styles[status] || styles.pending;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return { bg: "#fee2e2", text: "#dc2626" };
      case "high":
        return { bg: "#ffedd5", text: "#ea580c" };
      case "medium":
        return { bg: "#fef3c7", text: "#d97706" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const pendingPromos = promotionRequests.filter(r => r.status === "pending");
  const pendingEnforcement = enforcementRequests.filter(r => r.status === "pending");

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
          Final Approvals
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Approve or decline conversion offers with a clear audit trail
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        <button
          onClick={() => setActiveTab("promotions")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "promotions" ? "#ff5f1f" : "transparent",
            color: activeTab === "promotions" ? "white" : "#6b7280",
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
          <Scale size={18} />
          Promotion Requests
          {pendingPromos.length > 0 && (
            <span
              style={{
                backgroundColor: activeTab === "promotions" ? "rgba(255,255,255,0.3)" : "#ff5f1f",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {pendingPromos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("enforcement")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "enforcement" ? "#ff5f1f" : "transparent",
            color: activeTab === "enforcement" ? "white" : "#6b7280",
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
          <Shield size={18} />
          Enforcement Actions
          {pendingEnforcement.length > 0 && (
            <span
              style={{
                backgroundColor: activeTab === "enforcement" ? "rgba(255,255,255,0.3)" : "#ef4444",
                color: "white",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {pendingEnforcement.length}
            </span>
          )}
        </button>
      </div>

      {/* Promotion Requests Tab */}
      {activeTab === "promotions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {promotionRequests.length === 0 ? (
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
                No promotion requests
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Manager recommendations will appear here
              </p>
            </div>
          ) : (
            promotionRequests.map((req) => {
              const statusStyle = getStatusBadge(req.status);
              const StatusIcon = statusStyle.icon;
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
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
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          backgroundColor: "#e0e7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Scale size={24} color="#4338ca" />
                      </div>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                          {req.intern_name}
                        </p>
                        <p style={{ fontSize: "13px", color: "#6b7280" }}>
                          {req.intern_position} → {req.target_role_state.replace(/_/g, " ")}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                          Requested {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {req.manager_recommendation && (
                        <span
                          style={{
                            padding: "4px 10px",
                            backgroundColor: req.manager_recommendation === "promote" ? "#dcfce7" : "#fef3c7",
                            color: req.manager_recommendation === "promote" ? "#16a34a" : "#d97706",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          Manager: {req.manager_recommendation}
                        </span>
                      )}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 12px",
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        <StatusIcon size={14} />
                        {req.status}
                      </span>
                      {isExpanded ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ paddingTop: "16px" }}>
                        {/* Eligibility Info */}
                        <div style={{ marginBottom: "16px" }}>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                            Eligibility Status
                          </p>
                          <span
                            style={{
                              padding: "4px 12px",
                              backgroundColor: req.eligibility_status === "eligible" ? "#dcfce7" : "#fee2e2",
                              color: req.eligibility_status === "eligible" ? "#16a34a" : "#dc2626",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontWeight: 500,
                            }}
                          >
                            {req.eligibility_status}
                          </span>
                        </div>

                        {/* Sponsor Decision (if made) */}
                        {req.sponsor_decision && (
                          <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Sponsor Decision</p>
                            <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                              {req.sponsor_decision} {req.decided_at && `on ${formatDate(req.decided_at)}`}
                            </p>
                            {req.sponsor_comment && (
                              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                                "{req.sponsor_comment}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons (only for pending) */}
                        {req.status === "pending" && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(req);
                                setRequestType("promotion");
                              }}
                              style={{
                                flex: 1,
                                padding: "10px",
                                backgroundColor: "#ff5f1f",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              Review & Decide
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Enforcement Tab */}
      {activeTab === "enforcement" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {enforcementRequests.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "48px",
                textAlign: "center",
                border: "1px solid #e5e7eb",
              }}
            >
              <Shield size={48} style={{ color: "#d1d5db", marginBottom: "16px" }} />
              <p style={{ fontSize: "16px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
                No enforcement actions
              </p>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                High-impact actions requiring your approval will appear here
              </p>
            </div>
          ) : (
            enforcementRequests.map((req) => {
              const statusStyle = getStatusBadge(req.status);
              const StatusIcon = statusStyle.icon;
              const severityColor = getSeverityColor(req.severity);
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: `1px solid ${req.severity === "critical" ? "#fecaca" : "#e5e7eb"}`,
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
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          backgroundColor: severityColor.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AlertTriangle size={24} color={severityColor.text} />
                      </div>
                      <div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                          {req.action_type.toUpperCase()} - {req.intern_name}
                        </p>
                        <p style={{ fontSize: "13px", color: "#6b7280" }}>
                          {req.intern_position}
                        </p>
                        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                          Requested {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          backgroundColor: severityColor.bg,
                          color: severityColor.text,
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {req.severity}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 12px",
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        <StatusIcon size={14} />
                        {req.status.replace(/_/g, " ")}
                      </span>
                      {isExpanded ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0 20px 20px", borderTop: "1px solid #e5e7eb" }}>
                      <div style={{ paddingTop: "16px" }}>
                        {/* Reason */}
                        <div style={{ marginBottom: "16px" }}>
                          <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                            Reason for Action
                          </p>
                          <p style={{ fontSize: "14px", color: "#6b7280", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                            {req.reason}
                          </p>
                        </div>

                        {/* Duration (if applicable) */}
                        {req.recommended_duration && (
                          <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "4px" }}>
                              Recommended Duration
                            </p>
                            <p style={{ fontSize: "14px", color: "#111827" }}>{req.recommended_duration} days</p>
                          </div>
                        )}

                        {/* Evidence Links */}
                        {req.evidence_links && req.evidence_links.length > 0 && (
                          <div style={{ marginBottom: "16px" }}>
                            <p style={{ fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                              Evidence
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {req.evidence_links.map((link, i) => (
                                <a
                                  key={i}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: "13px", color: "#3b82f6" }}
                                >
                                  {link}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sponsor Decision (if made) */}
                        {req.sponsor_comment && (
                          <div style={{ padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Sponsor Decision</p>
                            <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                              {req.status} {req.decided_at && `on ${formatDate(req.decided_at)}`}
                            </p>
                            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                              "{req.sponsor_comment}"
                            </p>
                          </div>
                        )}

                        {/* Action Buttons (only for pending) */}
                        {req.status === "pending" && (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(req);
                                setRequestType("enforcement");
                              }}
                              style={{
                                flex: 1,
                                padding: "10px",
                                backgroundColor: "#ff5f1f",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              Review & Decide
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Decision Modal */}
      {selectedRequest && (
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
          onClick={() => setSelectedRequest(null)}
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
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                {requestType === "promotion" ? "Promotion Decision" : "Enforcement Decision"}
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
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
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
                  {requestType === "promotion" ? "Intern" : "Subject"}
                </p>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                  {(selectedRequest as any).intern_name}
                </p>
              </div>

              {/* Decision Selection */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                  Your Decision *
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setDecision("approved")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: decision === "approved" ? "#22c55e" : "#f3f4f6",
                      color: decision === "approved" ? "white" : "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ThumbsUp size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => setDecision("denied")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: decision === "denied" ? "#ef4444" : "#f3f4f6",
                      color: decision === "denied" ? "white" : "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ThumbsDown size={16} />
                    Deny
                  </button>
                  <button
                    onClick={() => setDecision("deferred")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor: decision === "deferred" ? "#4338ca" : "#f3f4f6",
                      color: decision === "deferred" ? "white" : "#374151",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Clock size={16} />
                    Defer
                  </button>
                </div>
              </div>

              {/* Reason Code */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Reason Code
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select a reason...</option>
                  {requestType === "promotion" ? (
                    <>
                      <option value="performance_met">Performance criteria met</option>
                      <option value="tenure_met">Tenure requirement met</option>
                      <option value="deliverables_complete">All deliverables complete</option>
                      <option value="needs_more_time">Needs more time</option>
                      <option value="performance_concerns">Performance concerns</option>
                      <option value="fit_concerns">Role fit concerns</option>
                    </>
                  ) : (
                    <>
                      <option value="policy_violation">Policy violation confirmed</option>
                      <option value="performance_issue">Performance issue validated</option>
                      <option value="insufficient_evidence">Insufficient evidence</option>
                      <option value="alternative_action">Alternative action recommended</option>
                      <option value="mitigating_circumstances">Mitigating circumstances</option>
                    </>
                  )}
                </select>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                  Comments (for audit trail)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide justification for your decision..."
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

              {/* Submit Button */}
              <button
                onClick={handleDecision}
                disabled={!decision || processing}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: !decision ? "#d1d5db" : "#ff5f1f",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: !decision || processing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {processing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {processing ? "Processing..." : "Submit Decision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorApprovals;
