import { useState, useEffect } from "react";
import { Card, Tabs, Button, Table, Tag, Space, Input, Select, Modal, message, Tooltip, Badge } from "antd";
import {
  FileTextOutlined,
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  HistoryOutlined,
  SignatureOutlined,
} from "@ant-design/icons";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import DocumentViewer from "./DocumentViewer";
import CreateDocumentModal from "./CreateDocumentModal";

interface BusinessDocument {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  category: string;
  file_url: string;
  status: string;
  version: number;
  requires_signature: boolean;
  signature_deadline: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  metadata: any;
}

interface DocumentSigner {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string | null;
  status: string;
  signed_at: string | null;
}

const { TabPane } = Tabs;
const { Search } = Input;

export default function DocumentCenter() {
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [selectedDocument, setSelectedDocument] = useState<BusinessDocument | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [filterCategory, filterStatus]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("business_documents")
        .select("*")
        .eq("is_latest_version", true)
        .order("created_at", { ascending: false });

      if (filterCategory) {
        query = query.eq("category", filterCategory);
      }
      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      message.error("Failed to load documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "default",
      pending_signature: "processing",
      partially_signed: "warning",
      signed: "success",
      declined: "error",
      expired: "default",
      archived: "default",
    };
    return colors[status] || "default";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      pending_signature: <ClockCircleOutlined />,
      partially_signed: <ExclamationCircleOutlined />,
      signed: <CheckCircleOutlined />,
    };
    return icons[status] || null;
  };

  const handleViewDocument = (document: BusinessDocument) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  const handleDownload = async (document: BusinessDocument) => {
    try {
      window.open(document.file_url, "_blank");
      message.success("Opening document...");
    } catch (error: any) {
      message.error("Failed to download: " + error.message);
    }
  };

  const columns = [
    {
      title: "Document",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: BusinessDocument) => (
        <Space direction="vertical" size={0}>
          <strong>{text}</strong>
          {record.description && (
            <span style={{ fontSize: 12, color: "#888" }}>{record.description}</span>
          )}
        </Space>
      ),
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value: any, record: BusinessDocument) =>
        record.title.toLowerCase().includes(value.toLowerCase()) ||
        record.description?.toLowerCase().includes(value.toLowerCase()),
    },
    {
      title: "Type",
      dataIndex: "document_type",
      key: "document_type",
      render: (type: string) => (
        <Tag color="blue">{type.replace(/_/g, " ").toUpperCase()}</Tag>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (category: string) => (
        <Tag>{category.charAt(0).toUpperCase() + category.slice(1)}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string, record: BusinessDocument) => (
        <Space>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status.replace(/_/g, " ").toUpperCase()}
          </Tag>
          {record.requires_signature && status === "pending_signature" && record.signature_deadline && (
            <Tooltip title={`Deadline: ${format(new Date(record.signature_deadline), "MMM dd, yyyy")}`}>
              <ClockCircleOutlined style={{ color: "#ff4d4f" }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: "Version",
      dataIndex: "version",
      key: "version",
      render: (version: number) => <Badge count={`v${version}`} style={{ backgroundColor: "#52c41a" }} />,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => format(new Date(date), "MMM dd, yyyy"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: BusinessDocument) => (
        <Space>
          <Tooltip title="View Document">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDocument(record)}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          {record.requires_signature && record.status !== "signed" && (
            <Tooltip title="Sign Document">
              <Button
                type="primary"
                icon={<SignatureOutlined />}
                onClick={() => handleViewDocument(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const filteredDocuments = documents;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            <FileTextOutlined style={{ marginRight: 12, color: "#FF6B00" }} />
            Document Center
          </h1>
          <p style={{ margin: "8px 0 0 0", color: "#666" }}>
            Manage contracts, agreements, and digital signatures
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => setCreateModalVisible(true)}
          style={{ background: "#FF6B00", borderColor: "#FF6B00" }}
        >
          Create Document
        </Button>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Search
            placeholder="Search documents..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Filter by Category"
            style={{ width: 200 }}
            onChange={setFilterCategory}
            allowClear
          >
            <Select.Option value="executive">Executive</Select.Option>
            <Select.Option value="merchant">Merchant</Select.Option>
            <Select.Option value="partner">Partner</Select.Option>
            <Select.Option value="employee">Employee</Select.Option>
            <Select.Option value="vendor">Vendor</Select.Option>
            <Select.Option value="compliance">Compliance</Select.Option>
            <Select.Option value="governance">Governance</Select.Option>
          </Select>
          <Select
            placeholder="Filter by Status"
            style={{ width: 200 }}
            onChange={setFilterStatus}
            allowClear
          >
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="pending_signature">Pending Signature</Select.Option>
            <Select.Option value="partially_signed">Partially Signed</Select.Option>
            <Select.Option value="signed">Signed</Select.Option>
            <Select.Option value="declined">Declined</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>
        </div>

        <Tabs defaultActiveKey="all">
          <TabPane tab={`All Documents (${filteredDocuments.length})`} key="all">
            <Table
              columns={columns}
              dataSource={filteredDocuments}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane
            tab={
              <Badge count={filteredDocuments.filter((d) => d.status === "pending_signature").length}>
                <span>Pending Signatures</span>
              </Badge>
            }
            key="pending"
          >
            <Table
              columns={columns}
              dataSource={filteredDocuments.filter((d) => d.status === "pending_signature")}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="Signed" key="signed">
            <Table
              columns={columns}
              dataSource={filteredDocuments.filter((d) => d.status === "signed")}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {selectedDocument && (
        <DocumentViewer
          visible={viewerVisible}
          document={selectedDocument}
          onClose={() => {
            setViewerVisible(false);
            setSelectedDocument(null);
            fetchDocuments();
          }}
        />
      )}

      <CreateDocumentModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchDocuments();
        }}
      />
    </div>
  );
}
