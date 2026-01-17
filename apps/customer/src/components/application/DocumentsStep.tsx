import { Button, Text, Card, Stack, Alert, Group, FileButton } from "@mantine/core";
import { ApplicationStepProps } from "@/types/application";
import { Upload, CheckCircle, X } from "lucide-react";

interface FileUploadFieldProps {
  label: string;
  description: string;
  required: boolean;
  file: File | undefined;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

const FileUploadField = ({ label, description, required, file, onUpload, onRemove }: FileUploadFieldProps) => {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {label} {required && <Text component="span" c="red">*</Text>}
      </Text>
      <Text size="xs" c="dimmed">{description}</Text>
      {file ? (
        <Card p="md" style={{ borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
          <Group justify="space-between">
            <Group gap="md">
              <CheckCircle size={20} style={{ color: '#22c55e' }} />
              <div>
                <Text size="sm" fw={500}>{file.name}</Text>
                <Text size="xs" c="dimmed">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              size="sm"
              color="red"
              onClick={onRemove}
              leftSection={<X size={16} />}
            >
              Remove
            </Button>
          </Group>
        </Card>
      ) : (
        <FileButton
          onChange={(file) => file && onUpload(file)}
          accept="image/*,.pdf"
        >
          {(props) => (
            <Card
              withBorder
              p="xl"
              style={{
                borderStyle: 'dashed',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              {...props}
            >
              <Stack align="center" gap="md">
                <div style={{ padding: 12, backgroundColor: 'rgba(255, 122, 0, 0.1)', borderRadius: '50%' }}>
                  <Upload size={24} style={{ color: '#ff7a00' }} />
                </div>
                <div>
                  <Text size="sm" fw={500}>Click to upload</Text>
                  <Text size="xs" c="dimmed">PNG, JPG or PDF (max 10MB)</Text>
                </div>
              </Stack>
            </Card>
          )}
        </FileButton>
      )}
    </Stack>
  );
};

export const DocumentsStep = ({ files, onFileUpload, onNext, onBack, isValid }: ApplicationStepProps) => {
  return (
    <Stack gap="lg">
      <div>
        <Text fw={700} size="xl" mb="xs">Upload Documents</Text>
        <Text c="dimmed">We need a few documents to verify your identity</Text>
      </div>

      <Alert color="blue">
        All documents must be clear, unedited photos or scans. Make sure all text is readable.
      </Alert>

      <FileUploadField
        label="Driver's License (Front)"
        description="Front side of your driver's license with photo visible"
        required
        file={files.driversLicenseFront}
        onUpload={(file) => onFileUpload('driversLicenseFront', file)}
        onRemove={() => onFileUpload('driversLicenseFront', undefined as any)}
      />

      <FileUploadField
        label="Driver's License (Back)"
        description="Back side of your driver's license (optional but recommended)"
        required={false}
        file={files.driversLicenseBack}
        onUpload={(file) => onFileUpload('driversLicenseBack', file)}
        onRemove={() => onFileUpload('driversLicenseBack', undefined as any)}
      />

      <FileUploadField
        label="Insurance Document"
        description="Proof of vehicle insurance (optional, if using a vehicle)"
        required={false}
        file={files.insuranceDocument}
        onUpload={(file) => onFileUpload('insuranceDocument', file)}
        onRemove={() => onFileUpload('insuranceDocument', undefined as any)}
      />

      <FileUploadField
        label="Vehicle Registration"
        description="Vehicle registration document (optional, if using a vehicle)"
        required={false}
        file={files.vehicleRegistration}
        onUpload={(file) => onFileUpload('vehicleRegistration', file)}
        onRemove={() => onFileUpload('vehicleRegistration', undefined as any)}
      />

      <Group gap="md" mt="md">
        <Button variant="outline" onClick={onBack} style={{ flex: 1 }} size="lg">
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid} style={{ flex: 1 }} size="lg" color="#ff7a00">
          Continue to Review
        </Button>
      </Group>
    </Stack>
  );
};
