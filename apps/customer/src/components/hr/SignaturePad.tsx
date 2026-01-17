// @ts-nocheck
import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button, Card, Form, Input, message } from "antd";
import { docsAPI } from "./api";

interface SignaturePadProps {
  documentId: string;
  onSigned: (url: string) => void;
  originalData: any;
}

export default function SignaturePad({
  documentId,
  onSigned,
  originalData,
}: SignaturePadProps) {
  const refCompany = useRef<SignatureCanvas>(null);
  const refExec = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [loading, setLoading] = useState(false);

  const toImg = (ref: React.RefObject<SignatureCanvas>) =>
    ref.current?.getTrimmedCanvas().toDataURL("image/png");

  const makeImgHtml = (dataUrl?: string) =>
    dataUrl ? `<img src="${dataUrl}" style="max-height:80px" />` : "";

  const submit = async () => {
    setLoading(true);
    try {
      const companyHtml = makeImgHtml(toImg(refCompany));
      const execHtml = makeImgHtml(toImg(refExec));

      const resp = await docsAPI.post("/documents/sign", {
        document_id: documentId,
        signature_company_html: companyHtml,
        signature_executive_html: execHtml,
        signature_exec_html: execHtml, // alias
        signature_holder_html: execHtml, // alias
        data: { ...originalData }, // for re-rendering with signatures
      });

      if (resp.signed_file_url) {
        onSigned(resp.signed_file_url);
        message.success("Signed and saved");
      }
    } catch (e: any) {
      message.error(e?.error || e?.message || "Sign failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Sign Document">
      <Form layout="vertical" onFinish={submit}>
        <Form.Item label="Signer Name (for audit)" required>
          <Input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Enter your name"
          />
        </Form.Item>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Company Signature</div>
            <SignatureCanvas
              ref={refCompany}
              canvasProps={{
                width: 320,
                height: 100,
                style: { border: "1px solid #ccc", borderRadius: 4 },
              }}
            />
            <Button
              onClick={() => refCompany.current?.clear()}
              style={{ marginTop: 8 }}
              size="small"
            >
              Clear
            </Button>
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Executive Signature</div>
            <SignatureCanvas
              ref={refExec}
              canvasProps={{
                width: 320,
                height: 100,
                style: { border: "1px solid #ccc", borderRadius: 4 },
              }}
            />
            <Button
              onClick={() => refExec.current?.clear()}
              style={{ marginTop: 8 }}
              size="small"
            >
              Clear
            </Button>
          </div>
        </div>
        <Button type="primary" htmlType="submit" style={{ marginTop: 16 }} loading={loading}>
          Apply Signatures & Save
        </Button>
      </Form>
    </Card>
  );
}

