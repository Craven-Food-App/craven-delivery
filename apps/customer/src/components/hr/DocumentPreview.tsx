// @ts-nocheck
import React from "react";
import { Card, Button, Space } from "antd";
import { EyeOutlined, PrinterOutlined, DownloadOutlined } from "@ant-design/icons";

interface DocumentPreviewProps {
  html?: string;
  fileUrl?: string;
}

export default function DocumentPreview({ html, fileUrl }: DocumentPreviewProps) {
  return (
    <Card title="Preview / Actions">
      <Space wrap>
        {html && (
          <Button
            icon={<EyeOutlined />}
            onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return;
              w.document.write(html);
              w.document.close();
            }}
          >
            Open HTML Preview
          </Button>
        )}
        {fileUrl && (
          <>
            <Button icon={<DownloadOutlined />} href={fileUrl} target="_blank" rel="noreferrer">
              Open Generated PDF
            </Button>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => {
                if (fileUrl) {
                  window.open(fileUrl, "_blank");
                  setTimeout(() => window.print(), 500);
                }
              }}
            >
              Print
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}

