// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Button,
  Space,
  Select,
  Input,
  InputNumber,
  Switch,
  Typography,
  Tooltip,
  message,
  Spin,
  Alert,
  Divider,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
  FileImageOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { supabase } from "@/integrations/supabase/client";
import dayjs from "dayjs";

// pdfjs-dist setup - use lazy loading to reduce bundle size
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

const loadPdfjs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const pdfWorker = await import('pdfjs-dist/build/pdf.worker?url');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;
  }
  return pdfjsLib;
};

const { Text } = Typography;

type FieldType = "signature" | "initials" | "date" | "text";

interface SignatureFieldLayout {
  id?: string;
  field_type: FieldType;
  signer_role: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  label?: string | null;
  required?: boolean;
  auto_filled?: boolean;
  rendered_value?: string | null;
}

interface ExecutiveDocumentSignatureTaggerProps {
  open: boolean;
  document: any;
  onClose: (refresh?: boolean) => void;
}

interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  url: string;
}

const PAGE_DISPLAY_WIDTH = 820;
const DEFAULT_FIELD_WIDTH = 28;
const DEFAULT_FIELD_HEIGHT = 12;
const DEFAULT_SIGNATURE_ROLE = "officer";

const FIELD_LABELS: Record<FieldType, string> = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
};

const FIELD_COLORS: Record<FieldType, string> = {
  signature: "rgba(59, 130, 246, 0.12)",
  initials: "rgba(139, 92, 246, 0.12)",
  date: "rgba(16, 185, 129, 0.12)",
  text: "rgba(99, 102, 241, 0.14)",
};

const normalizeRole = (role: string | null | undefined) => String(role || "").trim().toLowerCase();

// Comprehensive executive role list with colors (DocuSign-style)
const ALL_EXECUTIVE_ROLES = [
  { value: 'ceo', label: 'CEO - Chief Executive Officer', color: '#FF6B35', description: 'Chief Executive Officer' },
  { value: 'cfo', label: 'CFO - Chief Financial Officer', color: '#4ECDC4', description: 'Chief Financial Officer' },
  { value: 'coo', label: 'COO - Chief Operating Officer', color: '#45B7D1', description: 'Chief Operating Officer' },
  { value: 'cto', label: 'CTO - Chief Technology Officer', color: '#96CEB4', description: 'Chief Technology Officer' },
  { value: 'cxo', label: 'CXO - Chief Experience Officer', color: '#FFEAA7', description: 'Chief Experience Officer' },
  { value: 'board_member', label: 'Board Member', color: '#DDA15E', description: 'Member of the Board of Directors' },
  { value: 'board', label: 'Board of Directors', color: '#DDA15E', description: 'Board of Directors' },
  { value: 'officer', label: 'Officer', color: '#A8DADC', description: 'Corporate Officer' },
  { value: 'founder', label: 'Founder', color: '#F77F00', description: 'Company Founder' },
  { value: 'shareholder', label: 'Shareholder', color: '#FCBF49', description: 'Shareholder' },
  { value: 'incorporator', label: 'Incorporator', color: '#EAE2B7', description: 'Incorporator' },
  { value: 'secretary', label: 'Secretary', color: '#C9ADA7', description: 'Corporate Secretary' },
  { value: 'treasurer', label: 'Treasurer', color: '#9A8C98', description: 'Corporate Treasurer' },
];

// Get role color for visual identification
const getRoleColor = (role: string | null | undefined): string => {
  const normalized = normalizeRole(role);
  const roleData = ALL_EXECUTIVE_ROLES.find(r => r.value === normalized);
  return roleData?.color || '#6B7280';
};

// Get role label with description
const getRoleLabel = (role: string | null | undefined): string => {
  const normalized = normalizeRole(role);
  const roleData = ALL_EXECUTIVE_ROLES.find(r => r.value === normalized);
  return roleData?.label || normalized.toUpperCase();
};

const ExecutiveDocumentSignatureTagger: React.FC<ExecutiveDocumentSignatureTaggerProps> = ({
  open,
  document: doc,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [fields, setFields] = useState<SignatureFieldLayout[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.95);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [autoDetecting, setAutoDetecting] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    fieldId: string;
    offsetX: number;
    offsetY: number;
    boxWidth: number;
    boxHeight: number;
  } | null>(null);
  const fieldsRef = useRef<SignatureFieldLayout[]>([]);
  const pagesRef = useRef<RenderedPage[]>([]);

  const [docDetails, setDocDetails] = useState<any>(doc);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const requiredRoles = useMemo(() => {
    if (!docDetails?.required_signers) return [];
    if (Array.isArray(docDetails.required_signers)) {
      return docDetails.required_signers.map((role: string) => String(role || "").toLowerCase());
    }
    return [];
  }, [docDetails]);

  // Comprehensive role options - include ALL executive roles plus document-specific ones
  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    
    // Add all standard executive roles
    ALL_EXECUTIVE_ROLES.forEach(role => roles.add(role.value));
    
    // Add required roles from document
    requiredRoles.forEach((role) => roles.add(role.toLowerCase()));
    
    // Add document-specific roles
    if (docDetails?.role) {
      roles.add(String(docDetails.role).toLowerCase());
    }
    if (docDetails?.signer_roles && typeof docDetails.signer_roles === "object") {
      Object.keys(docDetails.signer_roles).forEach((role) => roles.add(role.toLowerCase()));
    }
    if (docDetails?.officer_name) {
      roles.add(`${docDetails.officer_name.toLowerCase()} (name)`);
    }
    
    return Array.from(roles).filter(Boolean).sort();
  }, [docDetails, requiredRoles]);

  // Group fields by signer role for DocuSign-style sidebar
  const fieldsBySigner = useMemo(() => {
    const grouped: Record<string, SignatureFieldLayout[]> = {};
    fields.forEach(field => {
      const role = field.signer_role || 'officer';
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(field);
    });
    return grouped;
  }, [fields]);

  const currentFields = useMemo(
    () => fields.filter((field) => field.page_number === activePage),
    [fields, activePage],
  );

  const activePageData = useMemo(
    () => pages.find((page) => page.pageNumber === activePage),
    [pages, activePage],
  );

  const displayDimensions = useMemo(() => {
    if (!activePageData) return { width: PAGE_DISPLAY_WIDTH, height: PAGE_DISPLAY_WIDTH * 1.414 };
    const scale = PAGE_DISPLAY_WIDTH / activePageData.width;
    return {
      width: PAGE_DISPLAY_WIDTH,
      height: activePageData.height * scale,
      scale,
    };
  }, [activePageData]);

  const fetchDocumentDetails = useCallback(async () => {
    if (!doc?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("executive_documents")
        .select("*")
        .eq("id", doc.id)
        .maybeSingle();

      if (error) throw error;

      setDocDetails(data || doc);
      const layout = (data?.signature_field_layout || doc?.signature_field_layout || []) as SignatureFieldLayout[];
      setFields(
        (layout || []).map((field, idx) => ({
          ...field,
          id: field.id || `field_${idx}_${Date.now()}`,
          field_type: (field.field_type || "signature") as FieldType,
          signer_role: String(field.signer_role || DEFAULT_SIGNATURE_ROLE).toLowerCase(),
          page_number: Number(field.page_number || 1),
          x_percent: Number(field.x_percent || 10),
          y_percent: Number(field.y_percent || 70),
          width_percent: Number(field.width_percent || DEFAULT_FIELD_WIDTH),
          height_percent: Number(field.height_percent || DEFAULT_FIELD_HEIGHT),
          required: field.required !== false,
          auto_filled: Boolean(field.auto_filled),
          rendered_value: field.rendered_value || null,
        })),
      );
    } catch (err: any) {
      console.error("Failed to load document details", err);
      message.error(err?.message || "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [doc]);

  const renderPdfPages = useCallback(async () => {
    if (!docDetails?.file_url) return;
    setPageLoading(true);
    try {
      const response = await fetch(docDetails.file_url);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const buffer = await response.arrayBuffer();
      const pdfjs = await loadPdfjs();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const pageRenderings: RenderedPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.3 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const url = canvas.toDataURL("image/png");
        pageRenderings.push({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          url,
        });
      }

      setPages(pageRenderings);
      setActivePage((prev) => Math.min(prev, pageRenderings.length || 1));
    } catch (err: any) {
      console.error("Failed to render PDF", err);
      message.error(err?.message || "Failed to render PDF");
    } finally {
      setPageLoading(false);
    }
  }, [docDetails]);

  useEffect(() => {
    if (open) {
      fetchDocumentDetails();
    } else {
      setActiveFieldId(null);
      setPages([]);
      setFields([]);
      setActivePage(1);
    }
  }, [open, fetchDocumentDetails]);

  useEffect(() => {
    if (docDetails?.file_url) {
      renderPdfPages();
    }
  }, [docDetails, renderPdfPages]);

  const handleAddField = (type: FieldType) => {
    const newField: SignatureFieldLayout = {
      id: `field_${Date.now()}`,
      field_type: type,
      signer_role:
        (type === "signature" && docDetails?.role ? String(docDetails.role).toLowerCase() : DEFAULT_SIGNATURE_ROLE) ||
        DEFAULT_SIGNATURE_ROLE,
      page_number: activePage,
      x_percent: 40,
      y_percent: 70,
      width_percent: type === "signature" ? 30 : 22,
      height_percent: type === "signature" ? 14 : 10,
      label: FIELD_LABELS[type],
      required: true,
      auto_filled: false,
      rendered_value: null,
    };
    setFields((prev) => [...prev, newField]);
    setActiveFieldId(newField.id!);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
    if (activeFieldId === fieldId) {
      setActiveFieldId(null);
    }
  };

  const updateField = (fieldId: string, updates: Partial<SignatureFieldLayout>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
    );
  };

  // Auto-detect signature fields from PDF text
  const autoDetectSignatureFields = useCallback(async () => {
    if (!docDetails?.file_url || pages.length === 0) {
      message.warning('Please load document pages first');
      return;
    }

    setAutoDetecting(true);
    try {
      // Fetch PDF
      const pdfResponse = await fetch(docDetails.file_url);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF');
      }
      const pdfBlob = await pdfResponse.blob();
      const pdfjs = await loadPdfjs();
      const pdfDoc = await pdfjs.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
      
      const detectedFields: SignatureFieldLayout[] = [];
      
      // Role detection patterns
      const rolePatterns: Record<string, RegExp> = {
        founder: /founder/i,
        ceo: /ceo|chief\s+executive\s+officer/i,
        cfo: /cfo|chief\s+financial\s+officer/i,
        coo: /coo|chief\s+operating\s+officer/i,
        cto: /cto|chief\s+technology\s+officer/i,
        officer: /officer/i,
        board_member: /board|director/i,
        secretary: /secretary/i,
        treasurer: /treasurer/i,
        shareholder: /shareholder/i,
        incorporator: /incorporator/i,
      };
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        const { width, height } = viewport;
        
        // Collect text items with positions
        const textItems: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
        
        textContent.items.forEach((item: any) => {
          const text = item.str || '';
          if (!text.trim()) return;
          
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const x = transform[4] || 0;
          const y = height - (transform[5] || 0); // Convert to top-down coordinates
          const itemWidth = item.width || 0;
          const itemHeight = item.height || 0;
          
          textItems.push({ text, x, y, width: itemWidth, height: itemHeight });
        });
        
        // Look for signature patterns
        textItems.forEach((item, index) => {
          const text = item.text.toLowerCase().trim();
          const originalText = item.text;
          
          // Expanded signature indicators - catch more patterns
          const isSignatureLabel = 
            /signature\s+of/i.test(originalText) ||
            /sign\s+here/i.test(originalText) ||
            /signature\s*:?/i.test(originalText) ||
            /(?:sign|signature)\s+(?:of|by)/i.test(originalText) ||
            /^signature$/i.test(text) ||
            /^sign$/i.test(text) ||
            /signature\s+line/i.test(originalText) ||
            /signature\s+block/i.test(originalText) ||
            // Look for role names followed by colon (e.g., "CEO:", "Founder:", "Officer:")
            /^(ceo|cfo|coo|cto|officer|founder|board|director|secretary|treasurer|shareholder|incorporator)\s*:?$/i.test(text) ||
            // Look for "By:" which often precedes signatures
            /^by\s*:?$/i.test(text) ||
            // Look for "Name:" which often appears before signature lines
            /^name\s*:?$/i.test(text);
          
          // Check for date indicators
          const isDateLabel = 
            /^date\s*:?$/i.test(text) ||
            /signed\s+on/i.test(originalText) ||
            /dated\s*:?/i.test(originalText) ||
            /date\s+signed/i.test(originalText);
          
          // Also look for signature lines (horizontal lines/underscores)
          // These appear as empty or very short text items with specific positioning
          const isSignatureLine = 
            (item.width > 100 && item.height < 5) || // Wide, thin element (likely a line)
            /^_{3,}$/.test(originalText) || // Underscores
            /^-{3,}$/.test(originalText); // Dashes
          
          if (isSignatureLabel || isSignatureLine) {
            // Determine role from context
            let detectedRole = 'officer';
            let roleConfidence = 0;
            
            // Get nearby text first (used in multiple places)
            const nearbyText = textItems
              .filter((other, idx) => {
                const distance = Math.sqrt(
                  Math.pow(other.x - item.x, 2) + Math.pow(other.y - item.y, 2)
                );
                return distance < 300 && Math.abs(idx - index) < 15;
              })
              .map(i => i.text)
              .join(' ');
            
            // Check current text for role (including role names like "CEO:", "Founder:")
            for (const [role, pattern] of Object.entries(rolePatterns)) {
              if (pattern.test(originalText)) {
                detectedRole = role;
                roleConfidence = 1.0;
                break;
              }
            }
            
            // Check for role name directly in text (e.g., "CEO:", "Founder:")
            if (roleConfidence < 1.0) {
              const roleMatch = originalText.match(/^(ceo|cfo|coo|cto|officer|founder|board|director|secretary|treasurer|shareholder|incorporator)\s*:?$/i);
              if (roleMatch) {
                const matchedRole = roleMatch[1].toLowerCase();
                // Map variations
                if (matchedRole === 'board' || matchedRole === 'director') {
                  detectedRole = 'board_member';
                } else {
                  detectedRole = matchedRole;
                }
                roleConfidence = 1.0;
              }
            }
            
            // Check nearby text (within 300px) for role hints - expanded search
            if (roleConfidence < 0.8) {
              for (const [role, pattern] of Object.entries(rolePatterns)) {
                if (pattern.test(nearbyText)) {
                  detectedRole = role;
                  roleConfidence = 0.7;
                  break;
                }
              }
              
              // Also check for role names in nearby text
              if (roleConfidence < 0.7) {
                const nearbyRoleMatch = nearbyText.match(/\b(ceo|cfo|coo|cto|officer|founder|board|director|secretary|treasurer|shareholder|incorporator)\b/i);
                if (nearbyRoleMatch) {
                  const matchedRole = nearbyRoleMatch[1].toLowerCase();
                  if (matchedRole === 'board' || matchedRole === 'director') {
                    detectedRole = 'board_member';
                  } else {
                    detectedRole = matchedRole;
                  }
                  roleConfidence = 0.6;
                }
              }
            }
            
            // Check document context for role hints
            if (roleConfidence < 0.7 && docDetails) {
              // Check required_signers
              if (docDetails.required_signers && Array.isArray(docDetails.required_signers)) {
                const requiredRole = docDetails.required_signers.find((r: string) => {
                  const roleLower = r.toLowerCase();
                  return rolePatterns[roleLower]?.test(originalText) || 
                         rolePatterns[roleLower]?.test(nearbyText);
                });
                if (requiredRole) {
                  detectedRole = requiredRole.toLowerCase();
                  roleConfidence = 0.8;
                }
              }
              
              // Check signer_roles
              if (docDetails.signer_roles && Array.isArray(docDetails.signer_roles)) {
                const signerRole = docDetails.signer_roles.find((r: string) => {
                  const roleLower = r.toLowerCase();
                  return rolePatterns[roleLower]?.test(originalText) || 
                         rolePatterns[roleLower]?.test(nearbyText);
                });
                if (signerRole) {
                  detectedRole = signerRole.toLowerCase();
                  roleConfidence = 0.75;
                }
              }
              
              // Check officer_name for name-based matching
              if (docDetails.officer_name) {
                const nameParts = docDetails.officer_name.toLowerCase().split(' ');
                const hasNameMatch = nameParts.some(part => 
                  part.length > 3 && originalText.toLowerCase().includes(part)
                );
                if (hasNameMatch && (roleConfidence < 0.6 || detectedRole === 'officer')) {
                  // Try to infer role from document type
                  if (docDetails.type?.includes('founder')) {
                    detectedRole = 'founder';
                    roleConfidence = 0.7;
                  } else if (docDetails.role) {
                    detectedRole = docDetails.role.toLowerCase();
                    roleConfidence = 0.7;
                  }
                }
              }
              
              // Infer from document type
              if (roleConfidence < 0.6) {
                const docType = (docDetails.type || '').toLowerCase();
                if (docType.includes('founder')) {
                  detectedRole = 'founder';
                  roleConfidence = 0.6;
                } else if (docType.includes('shareholder')) {
                  detectedRole = 'shareholder';
                  roleConfidence = 0.6;
                } else if (docType.includes('incorporation') || docType.includes('incorporator')) {
                  detectedRole = 'incorporator';
                  roleConfidence = 0.6;
                }
              }
            }
            
            // Create signature field below the detected text (or on the line if it's a signature line)
            const fieldX = (item.x / width) * 100;
            const fieldY = isSignatureLine 
              ? (item.y / height) * 100 // Place on the line itself
              : ((item.y + item.height + 10) / height) * 100; // Place field below text
            
            detectedFields.push({
              field_type: 'signature',
              signer_role: detectedRole,
              page_number: pageNum,
              x_percent: Math.max(5, Math.min(95, fieldX)),
              y_percent: Math.max(5, Math.min(95, fieldY)),
              width_percent: DEFAULT_FIELD_WIDTH,
              height_percent: DEFAULT_FIELD_HEIGHT,
              label: `Signature - ${detectedRole}`,
              required: true,
            });
          }
          
          // Check for date fields near signature fields
          if (isDateLabel) {
            // Find nearest signature field on same page
            const signatureFields = detectedFields.filter(
              f => f.page_number === pageNum && f.field_type === 'signature'
            );
            
            if (signatureFields.length > 0) {
              // Find the closest signature field to this date label
              let nearestSig = signatureFields[0];
              let minDistance = Infinity;
              
              signatureFields.forEach(sig => {
                const sigX = (sig.x_percent / 100) * width;
                const sigY = (sig.y_percent / 100) * height;
                const distance = Math.sqrt(
                  Math.pow(sigX - item.x, 2) + Math.pow(sigY - item.y, 2)
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  nearestSig = sig;
                }
              });
              
              // Only create date field if it's reasonably close (within 400px)
              if (minDistance < 400) {
                const dateX = (item.x / width) * 100;
                const dateY = ((item.y + item.height + 5) / height) * 100;
                
                detectedFields.push({
                  field_type: 'date',
                  signer_role: nearestSig.signer_role,
                  page_number: pageNum,
                  x_percent: Math.max(5, Math.min(95, dateX)),
                  y_percent: Math.max(5, Math.min(95, dateY)),
                  width_percent: 15,
                  height_percent: DEFAULT_FIELD_HEIGHT,
                  label: 'Date',
                  required: true,
                });
              }
            } else {
              // No signature field found yet, but create a date field anyway
              // It will be paired later or can be manually adjusted
              const detectedRole = docDetails?.role?.toLowerCase() || 'officer';
              const dateX = (item.x / width) * 100;
              const dateY = ((item.y + item.height + 5) / height) * 100;
              
              detectedFields.push({
                field_type: 'date',
                signer_role: detectedRole,
                page_number: pageNum,
                x_percent: Math.max(5, Math.min(95, dateX)),
                y_percent: Math.max(5, Math.min(95, dateY)),
                width_percent: 15,
                height_percent: DEFAULT_FIELD_HEIGHT,
                label: 'Date',
                required: true,
              });
            }
          }
        });
      }
      
      if (detectedFields.length > 0) {
        // Merge with existing fields (avoid duplicates)
        setFields(prev => {
          const merged = [...prev];
          detectedFields.forEach(newField => {
            // Check if field already exists at similar position (within 5% tolerance)
            const exists = merged.some(existing => 
              existing.page_number === newField.page_number &&
              Math.abs(existing.x_percent - newField.x_percent) < 5 &&
              Math.abs(existing.y_percent - newField.y_percent) < 5 &&
              existing.field_type === newField.field_type
            );
            if (!exists) {
              merged.push({
                ...newField,
                id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              });
            }
          });
          return merged;
        });
        message.success(`Auto-detected ${detectedFields.length} signature fields`);
      } else {
        message.info('No signature fields detected. You may need to add them manually.');
      }
    } catch (error: any) {
      console.error('Auto-detection error:', error);
      message.error('Failed to auto-detect fields: ' + (error?.message || 'Unknown error'));
    } finally {
      setAutoDetecting(false);
    }
  }, [docDetails, pages, fields]);

  const handlePointerDown = (field: SignatureFieldLayout, event: React.PointerEvent<HTMLDivElement>) => {
    if (!pageContainerRef.current) return;
    event.stopPropagation();

    const rect = pageContainerRef.current.getBoundingClientRect();
    const { width, height } = displayDimensions;
    const scaleFactor = PAGE_DISPLAY_WIDTH / (width * zoom);
    const pointerX = (event.clientX - rect.left) * scaleFactor;
    const pointerY = (event.clientY - rect.top) * scaleFactor;

    const fieldLeftPx = (field.x_percent / 100) * PAGE_DISPLAY_WIDTH;
    const fieldTopPx = (field.y_percent / 100) * (height / width) * PAGE_DISPLAY_WIDTH;

    const boxWidth = (field.width_percent / 100) * PAGE_DISPLAY_WIDTH;
    const boxHeight = (field.height_percent / 100) * (height / width) * PAGE_DISPLAY_WIDTH;

    dragRef.current = {
      fieldId: field.id!,
      offsetX: pointerX - fieldLeftPx,
      offsetY: pointerY - fieldTopPx,
      boxWidth,
      boxHeight,
    };
    setActiveFieldId(field.id!);
    setDraggingFieldId(field.id!); // Set dragging state for visual feedback

    const handleMove = (moveEvent: PointerEvent) => {
      if (!dragRef.current || !pageContainerRef.current) return;
      const moveRect = pageContainerRef.current.getBoundingClientRect();
      const moveX = (moveEvent.clientX - moveRect.left) * scaleFactor - dragRef.current.offsetX;
      const moveY = (moveEvent.clientY - moveRect.top) * scaleFactor - dragRef.current.offsetY;
      updateFieldPosition(field.id!, moveX, moveY, dragRef.current.boxWidth, dragRef.current.boxHeight);
    };

    const handleUp = () => {
      dragRef.current = null;
      setDraggingFieldId(null); // Clear dragging state
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const updateFieldPosition = useCallback(
    (fieldId: string, pointerX: number, pointerY: number, boxWidth: number, boxHeight: number) => {
      const maxLeft = PAGE_DISPLAY_WIDTH - boxWidth;
      const maxTop = (displayDimensions.height / displayDimensions.width) * PAGE_DISPLAY_WIDTH - boxHeight;

      const clampedLeft = Math.min(Math.max(pointerX, 0), maxLeft);
      const clampedTop = Math.min(Math.max(pointerY, 0), maxTop);

      const newXPercent = (clampedLeft / PAGE_DISPLAY_WIDTH) * 100;
      const newYPercent =
        (clampedTop / ((displayDimensions.height / displayDimensions.width) * PAGE_DISPLAY_WIDTH)) * 100;

      setFields((prev) =>
        prev.map((field) =>
          field.id === fieldId
            ? {
                ...field,
                x_percent: Number(newXPercent.toFixed(2)),
                y_percent: Number(newYPercent.toFixed(2)),
              }
            : field,
        ),
      );
    },
    [displayDimensions],
  );

  const handlePageClick = () => {
    setActiveFieldId(null);
  };

  const handleSave = async () => {
    if (!docDetails?.id) return;
    setSaving(true);
    try {
      const payload = fields.map((field) => ({
        ...field,
        id: field.id || undefined,
        auto_filled: Boolean(field.auto_filled),
        rendered_value: field.rendered_value || null,
      }));

      const { error } = await supabase
        .from("executive_documents")
        .update({
          signature_field_layout: payload,
        })
        .eq("id", docDetails.id);

      if (error) throw error;

      const autoFillTargetExists = payload.some(
        (field) =>
          String(field.field_type || "").toLowerCase() === "signature" &&
          ["ceo", "board", "incorporator"].includes(normalizeRole(field.signer_role)),
      );

      if (autoFillTargetExists) {
        const { data: applyResult, error: applyError } = await supabase.functions.invoke(
          "apply-executive-signature-layout",
          { body: { document_id: docDetails.id } },
        );

        if (applyError) {
          console.error("Failed to auto-apply CEO signature:", applyError);
          message.warning("Layout saved, but automatic CEO signature failed.");
        } else if (!applyResult?.ok) {
          message.warning(applyResult?.error || "CEO signature could not be applied automatically.");
        } else {
          message.success("CEO signature applied automatically.");
        }
      } else {
        message.success("Signature fields saved.");
      }

      onClose(true);
    } catch (err: any) {
      console.error("Failed to save signature layout", err);
      message.error(err?.message || "Failed to save signature layout");
    } finally {
      setSaving(false);
    }
  };

  const activeField = fields.find((field) => field.id === activeFieldId) || null;

  const renderFieldControls = () => {
    if (!activeField) {
      return (
        <Alert
          type="info"
          showIcon
          message="Select a field to edit"
          description="Click on a signature tab in the preview to configure signer role, label, or position."
        />
      );
    }

    return (
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <Divider plain>Field Settings</Divider>
        <div>
          <Text strong>Field Type</Text>
          <Select
            value={activeField.field_type}
            onChange={(value) => updateField(activeField.id!, { field_type: value })}
            style={{ width: "100%", marginTop: 4 }}
            options={[
              { value: "signature", label: "Signature" },
              { value: "initials", label: "Initials" },
              { value: "date", label: "Date" },
              { value: "text", label: "Text" },
            ]}
          />
        </div>

        <div>
          <Text strong>Signer Role</Text>
          <Select
            value={activeField.signer_role}
            style={{ width: "100%", marginTop: 4 }}
            onChange={(value) => updateField(activeField.id!, { signer_role: String(value).trim() })}
            showSearch
            placeholder="Select who will sign this field"
            filterOption={(input, option) => {
              const label = option?.label as string;
              return label?.toLowerCase().includes(input.toLowerCase()) || false;
            }}
            options={roleOptions.map((role) => {
              const roleData = ALL_EXECUTIVE_ROLES.find(r => r.value === role);
              return {
                value: role,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      background: getRoleColor(role),
                      flexShrink: 0
                    }} />
                    <span>{roleData?.label || role.toUpperCase()}</span>
                  </div>
                ),
              };
            })}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: "4px 0" }} />
                <div style={{ padding: "4px 8px" }}>
                  <Input
                    placeholder="Enter custom role name"
                    value={activeField.signer_role}
                    onChange={(event) =>
                      updateField(activeField.id!, { signer_role: String(event.target.value).trim() })
                    }
                    onPressEnter={(e) => {
                      const value = (e.target as HTMLInputElement).value.trim();
                      if (value) {
                        updateField(activeField.id!, { signer_role: value });
                      }
                    }}
                  />
                </div>
              </>
            )}
          />
          {activeField.signer_role && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              Color: <span style={{ color: getRoleColor(activeField.signer_role), fontWeight: 600 }}>
                {getRoleLabel(activeField.signer_role)}
              </span>
            </Text>
          )}
        </div>

        <div>
          <Text strong>Label</Text>
          <Input
            value={activeField.label || ""}
            placeholder="Field label"
            onChange={(event) => updateField(activeField.id!, { label: event.target.value || null })}
            style={{ marginTop: 4 }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong>Width %</Text>
            <InputNumber
              min={5}
              max={100}
              style={{ width: "100%", marginTop: 4 }}
              value={activeField.width_percent}
              onChange={(value) => updateField(activeField.id!, { width_percent: Number(value) || DEFAULT_FIELD_WIDTH })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Height %</Text>
            <InputNumber
              min={4}
              max={100}
              style={{ width: "100%", marginTop: 4 }}
              value={activeField.height_percent}
              onChange={(value) =>
                updateField(activeField.id!, { height_percent: Number(value) || DEFAULT_FIELD_HEIGHT })
              }
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong>Page</Text>
            <InputNumber
              min={1}
              max={pages.length || 1}
              style={{ width: "100%", marginTop: 4 }}
              value={activeField.page_number}
              onChange={(value) => updateField(activeField.id!, { page_number: Number(value) || 1 })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Required</Text>
            <div style={{ marginTop: 6 }}>
              <Switch
                checked={activeField.required !== false}
                onChange={(checked) => updateField(activeField.id!, { required: checked })}
              />
            </div>
          </div>
        </div>

        <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteField(activeField.id!)} block>
          Remove Field
        </Button>
      </Space>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={() => onClose()}
      width={1200}
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Button icon={<CloseOutlined />} onClick={() => onClose()}>
              Cancel
            </Button>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              disabled={fields.length === 0}
            >
              Save Layout
            </Button>
          </Space>
        </Space>
      }
      destroyOnClose
      title={
        <Space direction="vertical" size={0}>
          <span>Tag Signature Fields</span>
          {docDetails && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {docDetails.officer_name || "Unknown Executive"} • {docDetails.type?.replace(/_/g, " ")} •{" "}
              {dayjs(docDetails.created_at).format("MMM D, YYYY h:mm A")}
            </Text>
          )}
        </Space>
      }
    >
      <div style={{ display: "flex", gap: 18, minHeight: "70vh" }}>
        <div style={{ flex: 1.1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Space
            align="center"
            style={{ marginBottom: 12, justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
          >
            <Space wrap>
              <Button 
                icon={<ThunderboltOutlined />} 
                onClick={autoDetectSignatureFields}
                disabled={pageLoading || autoDetecting || pages.length === 0}
                loading={autoDetecting}
                type="dashed"
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
              >
                Auto-Detect Fields
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => handleAddField("signature")} disabled={pageLoading}>
                Signature
              </Button>
              <Button onClick={() => handleAddField("initials")} disabled={pageLoading}>
                Initials
              </Button>
              <Button onClick={() => handleAddField("date")} disabled={pageLoading}>
                Date
              </Button>
              <Button onClick={() => handleAddField("text")} disabled={pageLoading}>
                Text
              </Button>
            </Space>
            <Space>
              <Tooltip title="Zoom out">
                <Button
                  icon={<ZoomOutOutlined />}
                  onClick={() => setZoom((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
                />
              </Tooltip>
              <Tooltip title="Reset zoom">
                <Button icon={<AimOutlined />} onClick={() => setZoom(0.95)} />
              </Tooltip>
              <Tooltip title="Zoom in">
                <Button
                  icon={<ZoomInOutlined />}
                  onClick={() => setZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))}
                />
              </Tooltip>
            </Space>
          </Space>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              background: "#f8fafc",
              flex: 1,
              overflow: "auto",
            }}
          >
            {pageLoading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 420 }}>
                <Spin tip="Loading document..." />
              </div>
            ) : !activePageData ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 420 }}>
                <Space direction="vertical" align="center">
                  <FileImageOutlined style={{ fontSize: 32, color: "#94a3b8" }} />
                  <Text type="secondary">Select a page to preview</Text>
                </Space>
              </div>
            ) : (
              <div
                ref={pageContainerRef}
                onClick={handlePageClick}
                style={{
                  position: "relative",
                  width: displayDimensions.width * zoom,
                  height: displayDimensions.height * zoom,
                  margin: "0 auto",
                  background: "#fff",
                  boxShadow: "0 12px 24px rgba(148, 163, 184, 0.18)",
                  borderRadius: 8,
                  overflow: "hidden",
                  transition: "width 0.2s ease, height 0.2s ease",
                }}
              >
                <img
                  src={activePageData.url}
                  alt={`Page ${activePage}`}
                  style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                />
                {currentFields.map((field) => {
                  const left = (field.x_percent / 100) * (displayDimensions.width * zoom);
                  const top =
                    (field.y_percent / 100) * (displayDimensions.height * zoom);
                  const widthPx = (field.width_percent / 100) * (displayDimensions.width * zoom);
                  const heightPx = (field.height_percent / 100) * (displayDimensions.height * zoom);
                  const isActive = field.id === activeFieldId;
                  const isDragging = field.id === draggingFieldId;
                  const roleColor = getRoleColor(field.signer_role);
                  const roleLabel = getRoleLabel(field.signer_role);

                  return (
                    <div
                      key={field.id}
                      onPointerDown={(event) => handlePointerDown(field, event)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveFieldId(field.id!);
                      }}
                      style={{
                        position: "absolute",
                        left,
                        top,
                        width: widthPx,
                        height: heightPx,
                        border: isActive 
                          ? `3px solid ${roleColor}` 
                          : isDragging 
                          ? `2px dashed ${roleColor}`
                          : `2px solid ${roleColor}`,
                        borderRadius: 6,
                        background: isDragging 
                          ? `${roleColor}30` 
                          : `${roleColor}15`,
                        boxShadow: isActive 
                          ? `0 0 0 3px ${roleColor}40` 
                          : isDragging
                          ? `0 4px 12px ${roleColor}50`
                          : `0 2px 4px rgba(0,0,0,0.1)`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: roleColor,
                        fontWeight: 600,
                        fontSize: Math.max(9, Math.min(12, heightPx / 5)),
                        cursor: isDragging ? "grabbing" : "grab",
                        userSelect: "none",
                        pointerEvents: "auto",
                        transition: isDragging ? "none" : "all 0.15s ease",
                        transform: isDragging ? "scale(1.02)" : "scale(1)",
                        zIndex: isActive ? 10 : isDragging ? 9 : 1,
                      }}
                    >
                      <div style={{ 
                        background: roleColor, 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: 4,
                        fontSize: Math.max(8, Math.min(10, heightPx / 6)),
                        fontWeight: 700,
                        marginBottom: 2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}>
                        {roleLabel.split(' - ')[0]}
                      </div>
                      <div style={{ fontSize: Math.max(8, Math.min(10, heightPx / 7)), color: '#374151' }}>
                        {FIELD_LABELS[field.field_type]}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Space align="center" style={{ marginTop: 12, justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Text type="secondary">
              Zoom: {(zoom * 100).toFixed(0)}% • Fields on page {activePage}: {currentFields.length}
            </Text>
            <Space>
              <Text strong>Page</Text>
              <Select
                value={activePage}
                style={{ width: 160 }}
                onChange={(value) => {
                  setActiveFieldId(null);
                  setActivePage(Number(value));
                }}
                options={pages.map((page) => ({
                  label: `Page ${page.pageNumber}`,
                  value: page.pageNumber,
                }))}
              />
            </Space>
          </Space>
        </div>

        <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* DocuSign-style Signers Sidebar */}
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: 8, 
            padding: 12, 
            background: '#f9fafb',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <Text strong style={{ marginBottom: 12, display: 'block', fontSize: 14 }}>
              Signers ({Object.keys(fieldsBySigner).length})
            </Text>
            {Object.keys(fieldsBySigner).length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                No signers yet. Add signature fields to see them here.
              </Text>
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {Object.entries(fieldsBySigner).map(([role, roleFields]) => {
                  const roleColor = getRoleColor(role);
                  const roleLabel = getRoleLabel(role);
                  const signatureCount = roleFields.filter(f => f.field_type === 'signature').length;
                  const isSelected = roleFields.some(f => f.id === activeFieldId);
                  
                  return (
                    <div
                      key={role}
                      onClick={() => {
                        // Select first field of this role
                        if (roleFields.length > 0) {
                          setActiveFieldId(roleFields[0].id!);
                        }
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: isSelected ? `${roleColor}20` : 'white',
                        border: `1px solid ${isSelected ? roleColor : '#e5e7eb'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = `${roleColor}10`;
                          e.currentTarget.style.borderColor = roleColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ 
                          width: 14, 
                          height: 14, 
                          borderRadius: '50%', 
                          background: roleColor,
                          flexShrink: 0,
                          border: '2px solid white',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                        }} />
                        <Text strong style={{ fontSize: 13, flex: 1 }}>
                          {roleLabel.split(' - ')[0]}
                        </Text>
                        <Tag size="small" color={roleColor} style={{ margin: 0 }}>
                          {roleFields.length}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b7280', marginLeft: 22 }}>
                        <span>{signatureCount} signature{signatureCount !== 1 ? 's' : ''}</span>
                        {roleFields.length > signatureCount && (
                          <span>• {roleFields.length - signatureCount} other</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Space>
            )}
          </div>

          {/* Field Controls */}
          <Space direction="vertical" size={16} style={{ width: "100%", flex: 1 }}>
            <Alert
              type="info"
              showIcon
              message="DocuSign-style Tagging"
              description="Drag fields to position them. Each signer has a unique color for easy identification."
            />
            <Divider plain>Selected Field</Divider>
            {renderFieldControls()}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default ExecutiveDocumentSignatureTagger;

