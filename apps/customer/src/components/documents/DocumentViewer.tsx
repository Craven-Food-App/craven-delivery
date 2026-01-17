import { useState, useEffect, useRef } from "react";
import { Modal, Button, Tabs, Space, Tag, Descriptions, Timeline, message, Input, Divider } from "antd";
import {
  DownloadOutlined,
  HistoryOutlined,
  SignatureOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import SignatureCanvas from "react-signature-canvas";

const { TabPane } = Tabs;
const { TextArea } = Input;

interface DocumentViewerProps {
  visible: boolean;
  document: any;
  onClose: () => void;
}

interface DocumentSigner {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string | null;
  status: string;
  signed_at: string | null;
  typed_name: string | null;
}

interface DocumentVersion {
  id: string;
  version_number: number;
  file_url: string;
  changes_description: string | null;
  created_at: string;
}

export default function DocumentViewer({ visible, document, onClose }: DocumentViewerProps) {
  const [signers, setSigners] = useState<DocumentSigner[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [typedName, setTypedName] = useState("");
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (visible && document) {
      fetchSigners();
      fetchVersions();
    }
  }, [visible, document]);

  const fetchSigners = async () => {
    try {
      const { data, error } = await supabase
        .from("document_signers")
        .select("*")
        .eq("document_id", document.id)
        .order("signing_order", { ascending: true });

      if (error) throw error;
      setSigners(data || []);
    } catch (error: any) {
      message.error("Failed to load signers: " + error.message);
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_id", document.id)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      message.error("Failed to load versions: " + error.message);
    }
  };

  const handleSign = async () => {
    if (!typedName.trim()) {
      message.error("Please enter your name");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      message.error("Please provide your signature");
      return;
    }

    setSigning(true);
    try {
      const signatureDataUrl = signatureRef.current.getTrimmedCanvas().toDataURL("image/png");

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find current user's signer record
      const userSigner = signers.find((s) => s.signer_email === user.email && s.status === "pending");
      if (!userSigner) {
        message.error("You are not authorized to sign this document");
        return;
      }

      // Update signer record
      const { error: updateError } = await supabase
        .from("document_signers")
        .update({
          status: "signed",
          typed_name: typedName,
          signature_data_url: signatureDataUrl,
          signed_at: new Date().toISOString(),
        })
        .eq("id", userSigner.id);

      if (updateError) throw updateError;

      message.success("Document signed successfully!");
      setTypedName("");
      signatureRef.current?.clear();
      fetchSigners();
      onClose();
    } catch (error: any) {
      message.error("Failed to sign document: " + error.message);
    } finally {
      setSigning(false);
    }
  };

  const handleDownload = () => {
    window.open(document.file_url, "_blank");
  };

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: JSX.Element }> = {
      pending: { color: "processing", icon: <ClockCircleOutlined /> },
      signed: { color: "success", icon: <CheckCircleOutlined /> },
      declined: { color: "error", icon: <></> },
    };
    const { color, icon } = config[status] || { color: "default", icon: <></> };
    return (
      <Tag color={color} icon={icon}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: "#FF6B00" }} />
          <span>{document?.title}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download
        </Button>,
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="preview">
        <TabPane tab="Preview" key="preview">
          <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 8, minHeight: 400 }}>
            <iframe
              src={document?.file_url}
              style={{ width: "100%", height: "500px", border: "none", borderRadius: 4 }}
              title="Document Preview"
            />
          </div>
        </TabPane>

        <TabPane tab="Details" key="details">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Document Type">
              {document?.document_type?.replace(/_/g, " ").toUpperCase()}
            </Descriptions.Item>
            <Descriptions.Item label="Category">
              {document?.category?.charAt(0).toUpperCase() + document?.category?.slice(1)}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{getStatusTag(document?.status)}</Descriptions.Item>
            <Descriptions.Item label="Version">v{document?.version}</Descriptions.Item>
            <Descriptions.Item label="Created">
              {document?.created_at && format(new Date(document.created_at), "MMM dd, yyyy HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {document?.updated_at && format(new Date(document.updated_at), "MMM dd, yyyy HH:mm")}
            </Descriptions.Item>
            {document?.signature_deadline && (
              <Descriptions.Item label="Signature Deadline">
                {format(new Date(document.signature_deadline), "MMM dd, yyyy")}
              </Descriptions.Item>
            )}
            {document?.signed_at && (
              <Descriptions.Item label="Signed At">
                {format(new Date(document.signed_at), "MMM dd, yyyy HH:mm")}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Description" span={2}>
              {document?.description || "No description"}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        {document?.requires_signature && (
          <TabPane tab="Signatures" key="signatures">
            <Timeline>
              {signers.map((signer) => (
                <Timeline.Item
                  key={signer.id}
                  color={signer.status === "signed" ? "green" : "gray"}
                  dot={
                    signer.status === "signed" ? (
                      <CheckCircleOutlined style={{ fontSize: 16 }} />
                    ) : (
                      <ClockCircleOutlined style={{ fontSize: 16 }} />
                    )
                  }
                >
                  <div>
                    <strong>{signer.signer_name}</strong> ({signer.signer_email})
                    {signer.signer_role && <Tag style={{ marginLeft: 8 }}>{signer.signer_role}</Tag>}
                  </div>
                  <div style={{ marginTop: 4 }}>{getStatusTag(signer.status)}</div>
                  {signer.signed_at && (
                    <div style={{ marginTop: 4, color: "#888", fontSize: 12 }}>
                      Signed: {format(new Date(signer.signed_at), "MMM dd, yyyy HH:mm")}
                    </div>
                  )}
                  {signer.typed_name && (
                    <div style={{ marginTop: 4, fontStyle: "italic" }}>As: {signer.typed_name}</div>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>

            {document.status !== "signed" && (
              <>
                <Divider />
                <div style={{ marginTop: 24 }}>
                  <h3>Sign This Document</h3>
                  <Space direction="vertical" style={{ width: "100%" }} size="large">
                    <div>
                      <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                        Type Your Full Name
                      </label>
                      <Input
                        placeholder="Enter your full legal name"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        size="large"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                        Draw Your Signature
                      </label>
                      <div style={{ border: "2px solid #d9d9d9", borderRadius: 8 }}>
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{
                            width: 500,
                            height: 150,
                            style: { width: "100%", height: "150px" },
                          }}
                        />
                      </div>
                      <Button
                        size="small"
                        onClick={() => signatureRef.current?.clear()}
                        style={{ marginTop: 8 }}
                      >
                        Clear Signature
                      </Button>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<SignatureOutlined />}
                      onClick={handleSign}
                      loading={signing}
                      style={{ background: "#FF6B00", borderColor: "#FF6B00" }}
                    >
                      Sign Document
                    </Button>
                  </Space>
                </div>
              </>
            )}
          </TabPane>
        )}

        <TabPane tab={`Version History (${versions.length})`} key="versions" icon={<HistoryOutlined />}>
          <Timeline>
            {versions.map((version) => (
              <Timeline.Item key={version.id}>
                <div>
                  <strong>Version {version.version_number}</strong>
                  <div style={{ marginTop: 4, color: "#888", fontSize: 12 }}>
                    {format(new Date(version.created_at), "MMM dd, yyyy HH:mm")}
                  </div>
                  {version.changes_description && (
                    <div style={{ marginTop: 4 }}>{version.changes_description}</div>
                  )}
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(version.file_url, "_blank")}
                    style={{ padding: "4px 0" }}
                  >
                    Download
                  </Button>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>
      </Tabs>
    </Modal>
  );
}
