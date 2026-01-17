import { useState } from "react";
import { Modal, Form, Input, Select, DatePicker, Switch, Button, message, Upload, Space } from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import { supabase } from "@/integrations/supabase/client";
import type { UploadFile } from "antd";

const { TextArea } = Input;
const { Option } = Select;

interface CreateDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateDocumentModal({ visible, onClose, onSuccess }: CreateDocumentModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error("Please upload a document file");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to Supabase storage
      const file = fileList[0].originFileObj;
      if (!file) throw new Error("No file selected");

      const fileName = `business-documents/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Create document record
      const { error: insertError } = await supabase
        .from("business_documents")
        .insert({
          title: values.title,
          description: values.description,
          document_type: values.document_type,
          category: values.category,
          file_url: publicUrl,
          status: values.requires_signature ? "pending_signature" : "draft",
          requires_signature: values.requires_signature || false,
          signature_deadline: values.signature_deadline?.toISOString() || null,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      message.success("Document created successfully!");
      form.resetFields();
      setFileList([]);
      onSuccess();
    } catch (error: any) {
      message.error("Failed to create document: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create New Document"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ requires_signature: false }}
      >
        <Form.Item
          name="title"
          label="Document Title"
          rules={[{ required: true, message: "Please enter document title" }]}
        >
          <Input placeholder="e.g., Merchant Partnership Agreement" size="large" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea
            rows={3}
            placeholder="Brief description of the document"
          />
        </Form.Item>

        <Form.Item
          name="document_type"
          label="Document Type"
          rules={[{ required: true, message: "Please select document type" }]}
        >
          <Select placeholder="Select document type" size="large">
            <Option value="appointment">Officer Appointment</Option>
            <Option value="merchant_agreement">Merchant Agreement</Option>
            <Option value="nda">Non-Disclosure Agreement</Option>
            <Option value="employment_agreement">Employment Agreement</Option>
            <Option value="offer_letter">Offer Letter</Option>
            <Option value="consulting_agreement">Consulting Agreement</Option>
            <Option value="partnership_agreement">Partnership Agreement</Option>
            <Option value="service_agreement">Service Agreement</Option>
            <Option value="vendor_agreement">Vendor Agreement</Option>
            <Option value="board_resolution">Board Resolution</Option>
            <Option value="equity_grant">Equity Grant</Option>
            <Option value="other">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: "Please select category" }]}
        >
          <Select placeholder="Select category" size="large">
            <Option value="executive">Executive</Option>
            <Option value="merchant">Merchant</Option>
            <Option value="partner">Partner</Option>
            <Option value="employee">Employee</Option>
            <Option value="vendor">Vendor</Option>
            <Option value="compliance">Compliance</Option>
            <Option value="governance">Governance</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Upload Document" required>
          <Upload
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={() => false}
            maxCount={1}
            accept=".pdf,.doc,.docx"
          >
            <Button icon={<UploadOutlined />} size="large">
              Select File (PDF, DOC, DOCX)
            </Button>
          </Upload>
        </Form.Item>

        <Form.Item name="requires_signature" label="Requires Digital Signature" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.requires_signature !== currentValues.requires_signature
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("requires_signature") ? (
              <Form.Item name="signature_deadline" label="Signature Deadline">
                <DatePicker style={{ width: "100%" }} size="large" />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<PlusOutlined />}
              style={{ background: "#FF6B00", borderColor: "#FF6B00" }}
            >
              Create Document
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
