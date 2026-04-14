// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { sanitizeExecutiveDocumentHtml } from '@/utils/executiveDocumentHtml';
import {
  Stack,
  Card,
  Text,
  Badge,
  Button,
  Group,
  Modal,
  Input,
  TextInput,
  Progress,
  Alert,
  Loader,
  Center,
  Divider,
  Select,
} from '@mantine/core';
import {
  IconFileText,
  IconCheck,
  IconClock,
  IconLock,
  IconEye,
  IconDownload,
  IconPencil,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { notifications } from '@mantine/notifications';
import { useExecAuth } from '@/hooks/useExecAuth';
import dayjs from 'dayjs';
import ExecutiveSigningFlow from '@/components/executive/ExecutiveSigningFlow';

interface ExecutiveDocument {
  id: string;
  type: string;
  officer_name: string;
  role: string;
  status: string;
  signature_status: 'pending' | 'signed' | 'expired' | 'declined';
  file_url: string;
  signed_file_url?: string;
  created_at: string;
  signature_token?: string;
  signature_token_expires_at?: string;
  signing_stage?: number;
  signing_order?: number;
  depends_on_document_id?: string;
  appointment_id?: string;
  can_sign?: boolean;
  blocking_documents?: ExecutiveDocument[];
}

interface AppointmentDocument {
  id: string;
  appointment_id: string;
  document_type: string;
  document_url: string;
  created_at: string;
}

const MyDocuments: React.FC = () => {
  const { execUser, loading: authLoading } = useExecAuth();
  const [documents, setDocuments] = useState<ExecutiveDocument[]>([]);
  const [appointmentDocs, setAppointmentDocs] = useState<AppointmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<ExecutiveDocument | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [signModalVisible, setSignModalVisible] = useState(false);
  const [showNewSigningFlow, setShowNewSigningFlow] = useState(false);
  const [typedName, setTypedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [documentHtmlContent, setDocumentHtmlContent] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<Array<{ id: string; signature_name: string; signature_data_url: string; is_default: boolean }>>([]);
  const [selectedSavedSignature, setSelectedSavedSignature] = useState<string | null>(null);
  const [showSaveSignatureModal, setShowSaveSignatureModal] = useState(false);
  const [signatureName, setSignatureName] = useState('My Signature');

  useEffect(() => {
    if (!authLoading && execUser) {
      fetchDocuments();
      fetchSavedSignatures();
    }
  }, [authLoading, execUser]);

  const fetchSavedSignatures = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('executive_saved_signatures')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved signatures:', error);
        return;
      }

      setSavedSignatures(data || []);
      
      // Auto-load default signature if available
      const defaultSig = data?.find(s => s.is_default);
      if (defaultSig && canvasRef.current) {
        loadSignatureToCanvas(defaultSig.signature_data_url);
        setSelectedSavedSignature(defaultSig.id);
      }
    } catch (err) {
      console.error('Error fetching saved signatures:', err);
    }
  };

  const loadSignatureToCanvas = (dataUrl: string) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  };

  const saveSignature = async () => {
    if (!canvasRef.current) {
      notifications.show({
        title: 'Error',
        message: 'Please draw a signature first',
        color: 'red',
      });
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    if (!signatureDataUrl || signatureDataUrl === 'data:,') {
      notifications.show({
        title: 'Error',
        message: 'Please draw a signature first',
        color: 'red',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentExec } = await supabase
        .from('exec_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // If this is set as default, unset other defaults
      if (savedSignatures.length === 0) {
        // First signature is always default
        const { error } = await supabase
          .from('executive_saved_signatures')
          .insert({
            user_id: user.id,
            executive_id: currentExec?.id,
            signature_name: signatureName || 'My Signature',
            signature_data_url: signatureDataUrl,
            is_default: true,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('executive_saved_signatures')
          .upsert({
            user_id: user.id,
            executive_id: currentExec?.id,
            signature_name: signatureName || 'My Signature',
            signature_data_url: signatureDataUrl,
            is_default: false,
          }, {
            onConflict: 'user_id,signature_name',
          });

        if (error) throw error;
      }

      notifications.show({
        title: 'Success',
        message: 'Signature saved successfully',
        color: 'green',
      });

      setShowSaveSignatureModal(false);
      await fetchSavedSignatures();
    } catch (err: any) {
      console.error('Error saving signature:', err);
      notifications.show({
        title: 'Error',
        message: err.message || 'Failed to save signature',
        color: 'red',
      });
    }
  };

  const fetchDocuments = async () => {
    if (!execUser) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get exec_users.id for current user
      const { data: currentExec, error: execError } = await supabase
        .from('exec_users')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .single();

      if (execError || !currentExec) {
        console.error('Unable to verify executive status:', execError);
        console.error('User ID:', user.id, 'Email:', user.email);
        setLoading(false);
        return;
      }

      console.log('Current exec_user:', currentExec);

      // Fetch documents from executive_documents table by executive_id
      let { data: execDocs, error: execDocsError } = await supabase
        .from('executive_documents')
        .select('*')
        .eq('executive_id', currentExec.id)
        .order('created_at', { ascending: false });

      console.log('Documents fetched by executive_id:', execDocs?.length || 0);

      // FALLBACK 1: If no documents found by executive_id, try by officer_name matching this executive's appointment
      if (!execDocs || execDocs.length === 0) {
        console.log('No documents by executive_id, trying fallback queries...');

        const { data: userAppointment } = await supabase
          .from('executive_appointments')
          .select('proposed_officer_name')
          .eq('executive_id', currentExec.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userAppointment?.proposed_officer_name) {
          const { data: docsByName } = await supabase
            .from('executive_documents')
            .select('*')
            .ilike('officer_name', userAppointment.proposed_officer_name)
            .order('created_at', { ascending: false });

          if (docsByName && docsByName.length > 0) {
            console.log('Found documents by officer_name:', docsByName.length);
            execDocs = docsByName;
          }
        }
      }

      // FALLBACK 2: If still no documents found, try by appointment linked to this executive_id
      if (!execDocs || execDocs.length === 0) {
        console.log('Still no documents, trying appointment-based query...');

        const { data: userAppointments } = await supabase
          .from('executive_appointments')
          .select('id')
          .eq('executive_id', currentExec.id);

        if (userAppointments && userAppointments.length > 0) {
          const appointmentIds = userAppointments.map((a) => a.id);

          const { data: docsByAppointment } = await supabase
            .from('executive_documents')
            .select('*')
            .in('appointment_id', appointmentIds)
            .order('created_at', { ascending: false });

          if (docsByAppointment && docsByAppointment.length > 0) {
            console.log('Found documents by appointment_id:', docsByAppointment.length);
            execDocs = docsByAppointment;
          }
        }
      }

      // If no documents found after all fallbacks, try to sync from appointments
      if ((!execDocs || execDocs.length === 0) && user.email) {
        console.log('No documents in executive_documents, attempting to sync from appointments...');
        try {
          // @ts-ignore - RPC function type
          const { error: syncError } = await supabase.rpc('sync_executive_documents_from_appointments', {
            p_user_email: user.email,
          });

          if (syncError) {
            console.warn('Sync function not available or failed:', syncError);
            const syncResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/governance-sync-appointment-documents`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({ user_email: user.email }),
            });

            if (syncResponse.ok) {
              const { data: syncedDocs } = await supabase
                .from('executive_documents')
                .select('*')
                .eq('executive_id', currentExec.id)
                .order('created_at', { ascending: false });
              execDocs = syncedDocs;
            }
          } else {
            const { data: syncedDocs } = await supabase
              .from('executive_documents')
              .select('*')
              .eq('executive_id', currentExec.id)
              .order('created_at', { ascending: false });
            execDocs = syncedDocs;
          }
        } catch (syncErr) {
          console.warn('Error syncing documents:', syncErr);
        }
      }

      if (execDocsError) {
        console.error('Error fetching executive documents:', execDocsError);
      }

      // Fetch appointment documents for this executive
      let { data: appointments, error: appointmentsError } = await supabase
        .from('executive_appointments')
        .select('id, executive_id, proposed_officer_email, proposed_officer_name, formation_mode, status')
        .eq('executive_id', currentExec.id)
        .order('created_at', { ascending: false });

      // Fallback for legacy records without executive_id
      if ((!appointments || appointments.length === 0) && user.email) {
        const { data: appointmentsByEmail, error: appointmentsByEmailError } = await supabase
          .from('executive_appointments')
          .select('id, executive_id, proposed_officer_email, proposed_officer_name, formation_mode, status')
          .ilike('proposed_officer_email', user.email)
          .order('created_at', { ascending: false });

        if (appointmentsByEmail && appointmentsByEmail.length > 0) {
          appointments = appointmentsByEmail;
          appointmentsError = appointmentsByEmailError;
        }
      }

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      } else {
        console.log('Found appointments:', appointments?.length || 0, 'for email:', user.email);
        if (appointments && appointments.length > 0) {
          console.log('Appointment details:', appointments);
        }
      }
      
      // Try to backfill documents if none exist or if appointments have documents
      if (appointments && appointments.length > 0 && user.email) {
        console.log('Checking if backfill is needed...');
        try {
          // Call the backfill function via RPC for this specific user
          const { data: backfillCount, error: backfillError } = await supabase.rpc('backfill_my_executive_documents', {
            p_user_email: user.email
          });
          if (backfillError) {
            console.error('Backfill error:', backfillError);
          } else {
            console.log('Backfill created', backfillCount, 'documents');
            if (backfillCount > 0) {
              // Re-fetch documents after backfill
              const { data: newExecDocs, error: refetchError } = await supabase
                .from('executive_documents')
                .select('*')
                .eq('executive_id', currentExec.id)
                .order('created_at', { ascending: false });
              if (refetchError) {
                console.error('Error refetching after backfill:', refetchError);
              } else if (newExecDocs) {
                execDocs = newExecDocs;
                console.log('After backfill, found documents:', newExecDocs.length);
              }
            }
          }
        } catch (backfillErr) {
          console.error('Error running backfill:', backfillErr);
        }
      }

      // Build document list from appointments
      const appointmentDocuments: ExecutiveDocument[] = [];
      if (appointments && appointments.length > 0) {
        // Fetch all appointment data in parallel
        const appointmentDataPromises = appointments.map(appointment =>
          supabase
            .from('executive_appointments')
            .select('*')
            .eq('id', appointment.id)
            .single()
        );

        const appointmentDataResults = await Promise.all(appointmentDataPromises);

        appointments.forEach((appointment, index) => {
          const appointmentData = appointmentDataResults[index]?.data;
          if (!appointmentData) {
            console.log('No appointment data for appointment:', appointment.id);
            return;
          }

          console.log(`Processing appointment ${appointment.id}:`, {
            formation_mode: appointment.formation_mode,
            pre_incorporation_consent_url: appointmentData.pre_incorporation_consent_url,
            appointment_letter_url: appointmentData.appointment_letter_url,
            board_resolution_url: appointmentData.board_resolution_url,
            certificate_url: appointmentData.certificate_url,
            employment_agreement_url: appointmentData.employment_agreement_url,
            confidentiality_ip_url: appointmentData.confidentiality_ip_url,
            stock_subscription_url: appointmentData.stock_subscription_url,
            deferred_compensation_url: appointmentData.deferred_compensation_url,
          });

          // Pre-Incorporation Consent
          if (appointment.formation_mode && appointmentData.pre_incorporation_consent_url) {
            appointmentDocuments.push({
              id: `appointment-${appointment.id}-pre-incorporation-consent`,
              type: 'pre_incorporation_consent',
              officer_name: appointment.proposed_officer_name || '',
              role: 'Officer',
              status: 'generated',
              signature_status: 'pending',
              file_url: appointmentData.pre_incorporation_consent_url,
              created_at: appointmentData.created_at || new Date().toISOString(),
              appointment_id: appointment.id,
              can_sign: true,
            });
            console.log('Added pre_incorporation_consent document');
          }

          // All 20 appointment documents per Fortune 500 Executive Appointment Workflow
          const docFields = [
            { field: 'appointment_letter_url', type: 'appointment_letter' },
            { field: 'board_resolution_url', type: 'board_resolution' },
            { field: 'certificate_url', type: 'certificate' },
            { field: 'certificate_of_incorporation_url', type: 'certificate_of_incorporation' },
            { field: 'bylaws_url', type: 'company_bylaws' },
            { field: 'bylaws_acknowledgment_url', type: 'bylaws_acknowledgment' },
            { field: 'employment_agreement_url', type: 'employment_agreement' },
            { field: 'confidentiality_ip_url', type: 'confidentiality_ip' },
            { field: 'fiduciary_ethics_url', type: 'fiduciary_duty_ethics' },
            { field: 'conflict_disclosure_url', type: 'conflict_of_interest' },
            { field: 'officer_indemnification_url', type: 'officer_indemnification' },
            { field: 'equity_plan_url', type: 'equity_incentive_plan' },
            { field: 'stock_subscription_url', type: 'stock_subscription' },
            { field: 'option_rsu_award_url', type: 'option_rsu_award' },
            { field: 'founders_agreement_url', type: 'founders_agreement' },
            { field: 'shareholders_agreement_url', type: 'shareholders_agreement' },
            { field: 'deferred_compensation_url', type: 'deferred_compensation' },
          ];

          docFields.forEach(({ field, type }) => {
            const url = (appointmentData as any)[field];
            if (url) {
              appointmentDocuments.push({
                id: `appointment-${appointment.id}-${type}`,
                type,
                officer_name: appointment.proposed_officer_name || '',
                role: 'Officer',
                status: 'generated',
                signature_status: 'pending',
                file_url: url,
                created_at: appointmentData.created_at || new Date().toISOString(),
                appointment_id: appointment.id,
                can_sign: true,
              });
              console.log(`Added ${type} document`);
            }
          });
        });
        
        console.log('Total appointment documents found:', appointmentDocuments.length);
      }

      // Map existing execDocs by appointment_id-type for quick lookup
      const existingDocsMap = new Map<string, any>();
      (execDocs || []).forEach((d: any) => {
        if (d.appointment_id && d.type) {
          const key = `${d.appointment_id}-${d.type}`;
          existingDocsMap.set(key, d);
        }
      });

      // Merge appointment documents with existing ones
      // If an appointment doc exists in executive_documents, use that version (it has signature status)
      // Otherwise, add the appointment doc as a new pending document
      const mergedAppointmentDocs = appointmentDocuments.map((apptDoc) => {
        const key = `${apptDoc.appointment_id}-${apptDoc.type}`;
        const existingDoc = existingDocsMap.get(key);
        if (existingDoc) {
          // Use existing document from executive_documents (has signature status, etc.)
          return {
            ...existingDoc,
            signature_status: existingDoc.signature_status || 'pending',
            can_sign: !existingDoc.depends_on_document_id || 
              execDocs?.find((dep: any) => dep.id === existingDoc.depends_on_document_id && dep.signature_status === 'signed'),
          };
        }
        // New appointment document not yet in executive_documents
        return {
          ...apptDoc,
          signature_status: 'pending' as const,
          can_sign: true,
        };
      });

      // Get execDocs that are NOT already in mergedAppointmentDocs
      // If we have appointment documents, use those. Otherwise, use execDocs directly.
      const mergedAppointmentDocKeys = new Set(mergedAppointmentDocs.map(d => `${d.appointment_id}-${d.type}`));
      
      // Documents from executive_documents that aren't in merged appointment docs
      const standaloneDocs = (execDocs || []).filter((d: any) => {
        if (!d.appointment_id || !d.type) {
          return true; // Include documents without appointment_id
        }
        // Exclude if already in mergedAppointmentDocs
        return !mergedAppointmentDocKeys.has(`${d.appointment_id}-${d.type}`);
      });

      // If no appointments found but we have execDocs, use execDocs directly
      const documentsToShow = mergedAppointmentDocs.length > 0 
        ? [...standaloneDocs, ...mergedAppointmentDocs]
        : (execDocs || []); // Show all execDocs if no appointments found

      // Combine all documents
      const allDocs = documentsToShow.map((d: any) => ({
        ...d,
        signature_status: d.signature_status || 'pending',
        can_sign: !d.depends_on_document_id || 
          execDocs?.find((dep: any) => dep.id === d.depends_on_document_id && dep.signature_status === 'signed'),
      })).sort((a, b) => {
        if (a.signing_stage !== b.signing_stage) {
          return (a.signing_stage || 999) - (b.signing_stage || 999);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      console.log('Final document list:', {
        standaloneDocs: standaloneDocs.length,
        mergedAppointmentDocs: mergedAppointmentDocs.length,
        totalDocs: allDocs.length,
        docTypes: allDocs.map(d => d.type),
      });

      setDocuments(allDocs);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      notifications.show({
        title: 'Error',
        message: 'Failed to load documents',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeName = (type: string) => {
    const names: Record<string, string> = {
      pre_incorporation_consent: 'Pre-Incorporation Consent',
      certificate_of_incorporation: 'Certificate of Incorporation',
      company_bylaws: 'Company Bylaws',
      bylaws_acknowledgment: 'Bylaws Acknowledgment & Consent',
      board_resolution: 'Board Resolution',
      appointment_letter: 'Appointment Letter',
      offer_letter: 'Offer Letter',
      employment_agreement: 'Employment Agreement',
      confidentiality_ip: 'Confidentiality & IP Assignment',
      fiduciary_duty_ethics: 'Fiduciary Duty & Ethics Acknowledgment',
      fiduciary_ethics_ack: 'Fiduciary Duty & Ethics Acknowledgment',
      conflict_of_interest: 'Conflict of Interest Disclosure',
      conflict_of_interest_disclosure: 'Conflict of Interest Disclosure',
      officer_indemnification: 'Officer Indemnification Agreement',
      equity_incentive_plan: 'Equity Incentive Plan',
      stock_subscription: 'Stock Subscription Agreement',
      stock_issuance: 'Stock Subscription Agreement',
      option_rsu_award: 'Option/RSU Award Agreement',
      founders_agreement: "Founders' Agreement",
      shareholders_agreement: "Shareholders' Agreement",
      deferred_compensation: 'Deferred Compensation Addendum',
      deferred_comp_addendum: 'Deferred Compensation Addendum',
      certificate: 'Stock Certificate',
      background_check: 'Background Check',
      compensation_approval: 'Compensation Approval',
      executive_activation: 'System Activation',
    };
    return names[type] || type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusBadge = (doc: ExecutiveDocument) => {
    if (doc.signature_status === 'signed') {
      return <Badge color="green" leftSection={<IconCheck size={12} />}>Signed</Badge>;
    }
    if (doc.signature_status === 'expired') {
      return <Badge color="red">Expired</Badge>;
    }
    if (doc.signature_status === 'pending') {
      return <Badge color="orange" leftSection={<IconClock size={12} />}>Signature Required</Badge>;
    }
    return <Badge>{doc.status}</Badge>;
  };

  const isHtmlFile = (url: string): boolean => {
    return url.toLowerCase().endsWith('.html') || url.toLowerCase().includes('.html?');
  };

  const fetchHtmlContent = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const html = await response.text();
      return html;
    } catch (error) {
      console.error('Error fetching HTML content:', error);
      return null;
    }
  };

  const handleViewDocument = async (doc: ExecutiveDocument) => {
    setSelectedDocument(doc);
    setViewModalVisible(true);
    setDocumentHtmlContent(null);
    
    // Use signed_file_url if document is signed, otherwise use file_url
    const urlToView = doc.signature_status === 'signed' && doc.signed_file_url 
      ? doc.signed_file_url 
      : doc.file_url;
    
    if (urlToView && isHtmlFile(urlToView)) {
      setDocumentLoading(true);
      const htmlContent = await fetchHtmlContent(urlToView);
      setDocumentHtmlContent(htmlContent);
      setDocumentLoading(false);
    }
  };

  const handleSignDocument = async (doc: ExecutiveDocument) => {
    if (doc.signature_status === 'signed') {
      notifications.show({
        title: 'Already Signed',
        message: 'This document has already been signed',
        color: 'blue',
      });
      return;
    }
    setSelectedDocument(doc);
    setSignModalVisible(true);
    setDocumentHtmlContent(null);
    
    if (doc.file_url && isHtmlFile(doc.file_url)) {
      setDocumentLoading(true);
      const htmlContent = await fetchHtmlContent(doc.file_url);
      setDocumentHtmlContent(htmlContent);
      setDocumentLoading(false);
    }
  };

  // Initialize canvas
  useEffect(() => {
    if (signModalVisible && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 800;
        canvas.height = 350;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signModalVisible]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ('touches' in e ? e.touches[0].clientX - rect.left : (e as any).clientX - rect.left) * scaleX;
    const y = ('touches' in e ? e.touches[0].clientY - rect.top : (e as any).clientY - rect.top) * scaleY;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    if ('preventDefault' in e) e.preventDefault();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ('touches' in e ? e.touches[0].clientX - rect.left : (e as any).clientX - rect.left) * scaleX;
    const y = ('touches' in e ? e.touches[0].clientY - rect.top : (e as any).clientY - rect.top) * scaleY;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if ('preventDefault' in e) e.preventDefault();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    if (!selectedDocument) {
      notifications.show({
        title: 'Error',
        message: 'No document selected',
        color: 'red',
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      notifications.show({
        title: 'Error',
        message: 'Signature canvas not available',
        color: 'red',
      });
      return;
    }

    // Check if canvas has drawing
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasDrawing = imageData.data.some((pixel, index) => index % 4 === 3 && pixel > 0);

    if (!hasDrawing) {
      notifications.show({
        title: 'Signature Required',
        message: 'Please draw your signature before submitting',
        color: 'orange',
      });
      return;
    }

    const signaturePng = canvas.toDataURL('image/png');
    if (!signaturePng || signaturePng === 'data:,') {
      notifications.show({
        title: 'Error',
        message: 'Failed to capture signature',
        color: 'red',
      });
      return;
    }

    setIsSigning(true);
    try {
      // Get signer IP
      let signerIp: string | null = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        signerIp = ipData.ip || null;
      } catch (ipError) {
        console.warn('Could not fetch IP address:', ipError);
      }

      // If it's an appointment document, ensure it exists in executive_documents
      let documentId = selectedDocument.id;
      if (selectedDocument.appointment_id && selectedDocument.id.startsWith('appointment-')) {
        // This is a synthetic ID from appointment - need to find or create the real document
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: currentExec } = await supabase
          .from('exec_users')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!currentExec) throw new Error('Executive record not found');

        // Check if document already exists
        // @ts-ignore - Type instantiation depth issue
        const { data: existingDoc } = await supabase
          .from('executive_documents')
          .select('id')
          .eq('appointment_id', selectedDocument.appointment_id)
          .eq('type', selectedDocument.type)
          .maybeSingle();

        if (existingDoc) {
          documentId = existingDoc.id;
        } else {
          // Create the document record
          const { data: newDoc, error: createError } = await supabase
            .from('executive_documents')
            .insert({
              type: selectedDocument.type,
              officer_name: selectedDocument.officer_name,
              role: selectedDocument.role,
              executive_id: currentExec.id,
              file_url: selectedDocument.file_url,
              signature_status: 'pending',
              status: 'generated',
              appointment_id: selectedDocument.appointment_id,
            })
            .select('id')
            .single();

          if (createError || !newDoc) {
            throw new Error(createError?.message || 'Failed to create document record');
          }
          documentId = newDoc.id;
        }
      }

      // Submit signature via edge function
      const { data, error } = await supabase.functions.invoke('submit-executive-document-signature', {
        body: {
          document_id: documentId,
          typed_name: typedName.trim() || selectedDocument.officer_name || '',
          signature_png_base64: signaturePng,
          signer_ip: signerIp,
          signer_user_agent: navigator.userAgent,
          signature_token: selectedDocument.signature_token || null,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit signature');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Signature submission failed');
      }

      notifications.show({
        title: 'Success',
        message: 'Document signed successfully!',
        color: 'green',
      });

      setSignModalVisible(false);
      setSelectedDocument(null);
      setTypedName('');
      clearCanvas();
      await fetchDocuments();
    } catch (err: any) {
      console.error('Error submitting signature:', err);
      notifications.show({
        title: 'Error',
        message: err?.message || 'Failed to submit signature',
        color: 'red',
      });
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="lg" />
      </Center>
    );
  }

  // Show new signing flow if enabled
  if (showNewSigningFlow) {
    const pendingDocs = documents.filter(d => d.signature_status !== 'signed');
    return (
      <ExecutiveSigningFlow
        documents={pendingDocs.map(d => ({
          id: d.id,
          name: d.type?.replace(/_/g, ' ') || 'Document',
          fileUrl: d.file_url,
          type: d.type,
          signature_status: d.signature_status,
        }))}
        onComplete={() => {
          setShowNewSigningFlow(false);
          fetchDocuments();
        }}
      />
    );
  }

  const pendingDocs = documents.filter(d => d.signature_status === 'pending');
  const signedDocs = documents.filter(d => d.signature_status === 'signed');
  
  // Count documents that require executive signature (13 out of 20 workflow documents)
  const executiveSignatureRequiredTypes = [
    'pre_incorporation_consent',
    'appointment_letter', 
    'employment_agreement',
    'confidentiality_ip',
    'bylaws_acknowledgment',
    'fiduciary_duty_ethics',
    'conflict_of_interest',
    'officer_indemnification',
    'stock_subscription',
    'option_rsu_award',
    'founders_agreement',
    'shareholders_agreement',
    'deferred_compensation'
  ];
  
  const documentsRequiringSignature = documents.filter(d => 
    executiveSignatureRequiredTypes.includes(d.type)
  );
  const signedDocsRequiringSignature = signedDocs.filter(d => 
    executiveSignatureRequiredTypes.includes(d.type)
  );
  
  // Use actual count or default to expected count based on typical executive
  const TOTAL_REQUIRED_DOCUMENTS = documentsRequiringSignature.length > 0 
    ? documentsRequiringSignature.length 
    : 7; // Minimum universal documents
  
  const progressPercent = TOTAL_REQUIRED_DOCUMENTS > 0 
    ? Math.round((signedDocsRequiringSignature.length / TOTAL_REQUIRED_DOCUMENTS) * 100) 
    : 0;

  return (
    <Stack gap="md">
      {/* Progress Card */}
      {documents.length > 0 && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600} size="lg">Document Signing Progress</Text>
              <Text size="sm" c="dimmed">{signedDocsRequiringSignature.length} of {TOTAL_REQUIRED_DOCUMENTS} signed</Text>
            </Group>
            <Progress value={progressPercent} size="lg" radius="xl" />
            <Text size="xs" c="dimmed">
              {pendingDocs.length} document{pendingDocs.length !== 1 ? 's' : ''} requiring signature
            </Text>
          </Stack>
        </Card>
      )}

      {/* New Signing Flow Button */}
      {pendingDocs.length > 0 && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600} size="lg">Documents Requiring Signature</Text>
              <Button
                onClick={() => setShowNewSigningFlow(true)}
                leftSection={<IconPencil size={16} />}
                size="md"
              >
                Start Signing Flow
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Pending Documents */}
      {pendingDocs.length > 0 && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">Documents Requiring Signature</Text>
            {pendingDocs.map((doc) => (
              <Card key={doc.id} padding="md" radius="md" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Group align="flex-start" gap="md">
                    <IconFileText size={24} color={doc.can_sign ? 'orange' : 'gray'} />
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text fw={600}>{getDocumentTypeName(doc.type)}</Text>
                        {getStatusBadge(doc)}
                        {doc.signing_stage && (
                          <Badge variant="light" color="blue">Stage {doc.signing_stage}</Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        Created: {dayjs(doc.created_at).format('MMMM D, YYYY')}
                      </Text>
                      {!doc.can_sign && doc.blocking_documents && doc.blocking_documents.length > 0 && (
                        <Alert color="yellow" icon={<IconLock size={16} />}>
                          Previous document must be signed first
                        </Alert>
                      )}
                    </Stack>
                  </Group>
                  <Group>
                    <Button
                      variant="light"
                      leftSection={<IconEye size={16} />}
                      onClick={() => handleViewDocument(doc)}
                    >
                      View
                    </Button>
                    <Button
                      leftSection={<IconPencil size={16} />}
                      disabled={!doc.can_sign}
                      onClick={() => handleSignDocument(doc)}
                    >
                      Sign
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </Card>
      )}

      {/* Signed Documents */}
      {signedDocs.length > 0 && (
        <Card padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">Signed Documents</Text>
            {signedDocs.map((doc) => (
              <Card key={doc.id} padding="md" radius="md" withBorder>
                <Group justify="space-between">
                  <Group align="flex-start" gap="md">
                    <IconCheck size={24} color="green" />
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text fw={600}>{getDocumentTypeName(doc.type)}</Text>
                        {getStatusBadge(doc)}
                      </Group>
                      <Text size="sm" c="dimmed">
                        Signed: {dayjs(doc.created_at).format('MMMM D, YYYY')}
                      </Text>
                    </Stack>
                  </Group>
                  <Group>
                    {doc.signed_file_url && (
                      <Button
                        variant="light"
                        leftSection={<IconDownload size={16} />}
                        component="a"
                        href={doc.signed_file_url}
                        target="_blank"
                      >
                        Download Signed
                      </Button>
                    )}
                    <Button
                      variant="light"
                      leftSection={<IconEye size={16} />}
                      onClick={() => handleViewDocument(doc)}
                    >
                      View
                    </Button>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        </Card>
      )}

      {documents.length === 0 && (
        <Card padding="xl" radius="md" withBorder>
          <Center>
            <Stack align="center" gap="md">
              <IconFileText size={48} color="gray" />
              <Text fw={600} size="lg">No Documents Found</Text>
              <Text size="sm" c="dimmed" ta="center">
                You don't have any documents assigned to you at this time.
              </Text>
            </Stack>
          </Center>
        </Card>
      )}

      {/* View Document Modal */}
      <Modal
        opened={viewModalVisible}
        onClose={() => {
          setViewModalVisible(false);
          setSelectedDocument(null);
          setDocumentHtmlContent(null);
        }}
        title={selectedDocument ? `View: ${getDocumentTypeName(selectedDocument.type)}` : 'View Document'}
        size="xl"
      >
        {selectedDocument && (() => {
          // Use signed_file_url if document is signed, otherwise use file_url
          const urlToView = selectedDocument.signature_status === 'signed' && selectedDocument.signed_file_url 
            ? selectedDocument.signed_file_url 
            : selectedDocument.file_url;
          
          if (!urlToView) return null;
          
          return (
            <>
              {documentLoading ? (
                <Center h={600}>
                  <Loader size="lg" />
                </Center>
              ) : isHtmlFile(urlToView) && documentHtmlContent ? (
                <iframe
                  title="Document"
                  srcDoc={sanitizeExecutiveDocumentHtml(documentHtmlContent)}
                  style={{
                    height: '600px',
                    width: '100%',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f4f4f5',
                  }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <iframe
                  src={urlToView}
                  className="w-full"
                  style={{ height: '600px', border: '1px solid #ddd', borderRadius: '4px' }}
                  title="Document Viewer"
                />
              )}
            </>
          );
        })()}
      </Modal>

      {/* Sign Document Modal */}
      <Modal
        opened={signModalVisible}
        onClose={() => {
          if (!isSigning) {
            setSignModalVisible(false);
            setSelectedDocument(null);
            setTypedName('');
            setDocumentHtmlContent(null);
            clearCanvas();
          }
        }}
        title={selectedDocument ? `Sign: ${getDocumentTypeName(selectedDocument.type)}` : 'Sign Document'}
        size="xl"
        fullScreen={window.innerWidth < 1024}
        styles={{
          body: { maxHeight: '90vh', overflow: 'auto' },
        }}
      >
        {selectedDocument && (
          <Stack gap="md">
            <Alert color="blue">
              <Text size="sm">
                By signing below, you acknowledge that you have read and agree to the terms of this document.
                This electronic signature is legally binding and equivalent to a handwritten signature.
              </Text>
            </Alert>

            {/* Document Preview Section */}
            <div>
              <Text size="sm" fw={500} mb="xs">Document Preview</Text>
              {selectedDocument.file_url && (
                <>
                  {documentLoading ? (
                    <Center h={300}>
                      <Loader size="md" />
                    </Center>
                  ) : isHtmlFile(selectedDocument.file_url) && documentHtmlContent ? (
                    <iframe
                      title="Document preview"
                      srcDoc={sanitizeExecutiveDocumentHtml(documentHtmlContent)}
                      style={{
                        width: '100%',
                        height: '300px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#f4f4f5',
                      }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <iframe
                      src={selectedDocument.file_url}
                      style={{ width: '100%', height: '300px', border: '1px solid #ddd', borderRadius: '4px' }}
                      title="Document Preview"
                    />
                  )}
                </>
              )}
            </div>

            <Divider label="Signature Section" labelPosition="center" />

            {/* Signature Input Section */}
            <Stack gap="md">
              <TextInput
                label="Type your full legal name"
                placeholder="Full legal name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                required
                size="md"
              />
              
              {/* Saved Signatures Selector */}
              {savedSignatures.length > 0 && (
                <Select
                  label="Load Saved Signature"
                  placeholder="Select a saved signature"
                  data={savedSignatures.map(sig => ({
                    value: sig.id,
                    label: `${sig.signature_name}${sig.is_default ? ' (Default)' : ''}`,
                  }))}
                  value={selectedSavedSignature}
                  onChange={(value) => {
                    setSelectedSavedSignature(value);
                    if (value) {
                      const sig = savedSignatures.find(s => s.id === value);
                      if (sig) {
                        loadSignatureToCanvas(sig.signature_data_url);
                      }
                    }
                  }}
                  clearable
                  size="md"
                />
              )}

              <div>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Draw your signature</Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => setShowSaveSignatureModal(true)}
                  >
                    Save Signature
                  </Button>
                </Group>
                <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '1.5rem', background: 'white' }}>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={350}
                    style={{
                      width: '100%',
                      minHeight: '350px',
                      border: '2px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'crosshair',
                      touchAction: 'none',
                      background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                      backgroundSize: '20px 20px',
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button variant="light" size="sm" mt="xs" onClick={clearCanvas}>
                  Clear Signature
                </Button>
              </div>
            </Stack>

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setSignModalVisible(false);
                  setSelectedDocument(null);
                  setTypedName('');
                  clearCanvas();
                }}
                disabled={isSigning}
              >
                Cancel
              </Button>
              <Button
                onClick={submitSignature}
                disabled={isSigning || !typedName.trim()}
                loading={isSigning}
                leftSection={<IconPencil size={16} />}
              >
                {isSigning ? 'Signing...' : 'Sign & Submit'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Save Signature Modal */}
      <Modal
        opened={showSaveSignatureModal}
        onClose={() => {
          setShowSaveSignatureModal(false);
          setSignatureName('My Signature');
        }}
        title="Save Signature"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Signature Name"
            placeholder="My Signature"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            required
          />
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setShowSaveSignatureModal(false);
                setSignatureName('My Signature');
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveSignature}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default MyDocuments;

