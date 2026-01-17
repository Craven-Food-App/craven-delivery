// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Table, Button, Tag, Space, Modal, Input, message, Select, Card, Collapse, Typography } from "antd";
import { EyeOutlined, MailOutlined, DownloadOutlined, ReloadOutlined, DeleteOutlined, ExclamationCircleOutlined, FolderOutlined, FileTextOutlined, ClockCircleOutlined, EditOutlined } from "@ant-design/icons";
import { supabase } from "@/integrations/supabase/client";
import { docsAPI } from "./api";
import dayjs from "dayjs";
import ExecutiveDocumentSignatureTagger from "./ExecutiveDocumentSignatureTagger";

const { Panel } = Collapse;
const { Text } = Typography;

export default function DocumentDashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [taggingDoc, setTaggingDoc] = useState<any>(null);
  const [emailForm] = React.useState({ to: "", subject: "Crave'n Executive Document", message: "" });
  const [isCEO, setIsCEO] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    checkIfCEO();
  }, []);

  const checkIfCEO = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCEO(false);
        return;
      }

      const { data: execUser, error } = await supabase
        .from("exec_users")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || !execUser) {
        setIsCEO(false);
        return;
      }

      setIsCEO(execUser.role === "ceo");
    } catch (err) {
      console.error("Error checking CEO status:", err);
      setIsCEO(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("executive_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      console.error("Error fetching documents:", err);
      message.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Group documents by executive name
  const groupDocumentsByExecutive = () => {
    const grouped: Record<string, any[]> = {};
    
    documents.forEach((doc) => {
      const executiveName = doc.officer_name || "Unknown Executive";
      if (!grouped[executiveName]) {
        grouped[executiveName] = [];
      }
      grouped[executiveName].push(doc);
    });

    // Sort documents within each group by created_at (newest first)
    Object.keys(grouped).forEach((name) => {
      grouped[name].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return grouped;
  };

  const formatDateTime = (dateString: string) => {
    const date = dayjs(dateString);
    return {
      date: date.format("MMMM D, YYYY"),
      time: date.format("h:mm A"),
      full: date.format("MMMM D, YYYY [at] h:mm A"),
    };
  };

  const handleEmail = async (doc: any) => {
    setSelectedDoc(doc);
    setEmailModalVisible(true);
  };

  const sendEmail = async () => {
    if (!selectedDoc || !emailForm.to) {
      message.warning("Please enter recipient email");
      return;
    }

    try {
      await docsAPI.post("/documents/email", {
        document_id: selectedDoc.id,
        to: emailForm.to,
        subject: emailForm.subject,
        message_html: emailForm.message || "Your document is attached and/or available via the portal.",
      });
      message.success("Email sent");
      setEmailModalVisible(false);
      setSelectedDoc(null);
      emailForm.to = "";
      emailForm.subject = "Crave'n Executive Document";
      emailForm.message = "";
    } catch (e: any) {
      message.error(e?.error || e?.message || "Failed to send email");
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      // First, get all document IDs to delete signatures
      const { data: allDocs, error: fetchError } = await supabase
        .from("executive_documents")
        .select("id");

      if (fetchError) throw fetchError;

      const docIds = allDocs?.map(doc => doc.id) || [];

      // Delete all signatures linked to documents (if any)
      if (docIds.length > 0) {
        const { error: sigError } = await supabase
          .from("executive_signatures")
          .delete()
          .in("document_id", docIds);

        if (sigError) {
          console.warn("Error deleting signatures (may not exist):", sigError);
          // Continue with document deletion even if signatures fail
        }
      }

      // Delete all documents from executive_documents table
      // Using a simple delete without conditions (Supabase requires at least one filter, so we use a true condition)
      const { error } = await supabase
        .from("executive_documents")
        .delete()
        .gte("created_at", "1970-01-01"); // This matches all documents since created_at is always after 1970

      if (error) throw error;

      const deletedCount = documents.length;
      message.success(`Successfully deleted all ${deletedCount} documents`);
      await fetchDocuments(); // Refresh the list
    } catch (err: any) {
      console.error("Error deleting all documents:", err);
      message.error(err?.message || "Failed to delete all documents");
    } finally {
      setDeleting(false);
    }
  };

  const showDeleteAllConfirm = () => {
    Modal.confirm({
      title: "Delete All Documents?",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to permanently delete all ${documents.length} documents? This action cannot be undone.`,
      okText: "Yes, Delete All",
      okType: "danger",
      cancelText: "Cancel",
      onOk: handleDeleteAll,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "green";
      case "generated":
        return "blue";
      case "sent":
        return "orange";
      default:
        return "default";
    }
  };

  const groupedDocs = groupDocumentsByExecutive();
  const executiveNames = Object.keys(groupedDocs).sort();

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>
          Document Library 
          {documents.length > 0 && (
            <span style={{ fontWeight: "normal", fontSize: "14px", color: "#666", marginLeft: "8px" }}>
              ({documents.length} document{documents.length !== 1 ? "s" : ""} across {executiveNames.length} executive{executiveNames.length !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        <Space>
          {isCEO && (
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={showDeleteAllConfirm}
              loading={deleting}
              disabled={documents.length === 0}
            >
              Delete All Documents
            </Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={fetchDocuments} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <ReloadOutlined spin style={{ fontSize: "24px" }} />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
            <FileTextOutlined style={{ fontSize: "48px", marginBottom: "16px" }} />
            <p>No documents found</p>
          </div>
        </Card>
      ) : (
        <Collapse
          defaultActiveKey={executiveNames}
          style={{ background: "#fff" }}
          expandIcon={({ isActive }) => (
            <FolderOutlined style={{ color: isActive ? "#1890ff" : "#666" }} />
          )}
        >
          {executiveNames.map((executiveName) => {
            const execDocs = groupedDocs[executiveName];
            const docCount = execDocs.length;
            
            return (
              <Panel
                key={executiveName}
                header={
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FolderOutlined style={{ fontSize: "18px", color: "#1890ff" }} />
                    <Text strong style={{ fontSize: "16px" }}>{executiveName}</Text>
                    <Tag color="blue">{docCount} document{docCount !== 1 ? "s" : ""}</Tag>
                  </div>
                }
                style={{ marginBottom: "8px" }}
              >
                <div style={{ padding: "8px 0" }}>
                  {execDocs.map((doc) => {
                    const dateTime = formatDateTime(doc.created_at);
                    
                    return (
                      <Card
                        key={doc.id}
                        size="small"
                        style={{ 
                          marginBottom: "8px",
                          border: "1px solid #e8e8e8",
                          borderRadius: "4px"
                        }}
                        bodyStyle={{ padding: "12px 16px" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1", minWidth: "300px" }}>
                            <FileTextOutlined style={{ fontSize: "20px", color: "#1890ff" }} />
                            <div style={{ flex: "1" }}>
                              <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                                {doc.type ? doc.type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Document"}
                              </div>
                              <div style={{ fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: "8px" }}>
                                <ClockCircleOutlined />
                                <span>{dateTime.date}</span>
                                <span>•</span>
                                <span>{dateTime.time}</span>
                                {doc.role && (
                                  <>
                                    <span>•</span>
                                    <Tag size="small" color="purple">{doc.role.toUpperCase()}</Tag>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Tag color={getStatusColor(doc.status)} style={{ margin: 0 }}>
                              {doc.status?.toUpperCase() || "GENERATED"}
                            </Tag>
                            <Space>
          {doc.file_url && (
            <Button
              icon={<EyeOutlined />}
              size="small"
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
            >
              View
            </Button>
          )}
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => setTaggingDoc(doc)}
          >
            Tag Signatures
          </Button>
                              {doc.signed_file_url && (
                                <Button
                                  icon={<DownloadOutlined />}
                                  size="small"
                                  href={doc.signed_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Signed PDF
                                </Button>
                              )}
                              <Button 
                                icon={<MailOutlined />} 
                                size="small" 
                                onClick={() => handleEmail(doc)}
                              >
                                Email
                              </Button>
                            </Space>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </Collapse>
      )}

      <Modal
        title="Send Document via Email"
        open={emailModalVisible}
        onOk={sendEmail}
        onCancel={() => {
          setEmailModalVisible(false);
          setSelectedDoc(null);
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label>To:</label>
          <Input
            value={emailForm.to}
            onChange={(e) => (emailForm.to = e.target.value)}
            placeholder="recipient@example.com"
            style={{ marginTop: 8 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Subject:</label>
          <Input
            value={emailForm.subject}
            onChange={(e) => (emailForm.subject = e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
        <div>
          <label>Message:</label>
          <Input.TextArea
            value={emailForm.message}
            onChange={(e) => (emailForm.message = e.target.value)}
            rows={4}
            placeholder="Your document is attached and/or available via the portal."
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
      {taggingDoc && (
        <ExecutiveDocumentSignatureTagger
          open={Boolean(taggingDoc)}
          document={taggingDoc}
          onClose={async (refresh) => {
            setTaggingDoc(null);
            if (refresh) {
              await fetchDocuments();
            }
          }}
        />
      )}
    </>
  );
}

