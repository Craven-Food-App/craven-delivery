import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  TextInput,
  Textarea,
  Stack,
  Group,
  Text,
  Avatar,
  Badge,
  Loader,
  Center,
  FileInput,
  Tooltip,
  ActionIcon,
  MultiSelect,
  Box,
  Divider,
  UnstyledButton,
  Title,
  Modal,
  Paper,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconUser,
  IconPlus,
  IconPaperclip,
  IconFile,
  IconFileTypePdf,
  IconPhoto,
  IconDownload,
  IconTrash,
  IconSend,
  IconMessages,
  IconHash,
  IconEye,
  IconExternalLink,
  IconArrowLeft,
} from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import {
  INTERNAL_COMMS_BUCKET,
  extractInternalCommsStoragePath,
  resolveInternalCommsFileAccess,
  downloadInternalCommsAttachment,
  attachmentLooksLikeImage,
  attachmentLooksLikePdf,
} from '@/lib/internalCommsStorage';

// Pre-initialize AudioContext on first user gesture so realtime callbacks can play sounds
let sharedAudioCtx: AudioContext | null = null;

const ensureAudioContext = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

// Prime audio context on any user interaction so it's unlocked for later
if (typeof window !== 'undefined') {
  const primeAudio = () => {
    ensureAudioContext();
    window.removeEventListener('click', primeAudio);
    window.removeEventListener('keydown', primeAudio);
    window.removeEventListener('touchstart', primeAudio);
  };
  window.addEventListener('click', primeAudio, { once: true });
  window.addEventListener('keydown', primeAudio, { once: true });
  window.addEventListener('touchstart', primeAudio, { once: true });
}

const playNotificationSound = () => {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);
    playTone(1320, now + 0.12, 0.2);
  } catch {
    // Audio not available
  }
};

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  file_type: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  subject: string | null;
  body: string;
  channel: string;
  parent_id: string | null;
  recipient_ids: string[];
  read_by: string[];
  created_at: string;
  sender_name?: string;
  thread_label?: string;
  attachments?: Attachment[];
}

interface Recipient {
  user_id: string;
  label: string;
}

const fileIcon = (type: string | null) => {
  if (!type) return <IconFile size={14} />;
  if (type.includes('pdf')) return <IconFileTypePdf size={14} color="var(--mantine-color-red-6)" />;
  if (type.includes('image')) return <IconPhoto size={14} color="var(--mantine-color-blue-6)" />;
  return <IconFile size={14} />;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Slack-style sidebar title: other participant(s) in the thread */
function threadSidebarLabel(
  msg: Message,
  currentUserId: string | undefined,
  labelFor: (id: string) => string,
) {
  const ids = Array.from(new Set([msg.sender_id, ...(msg.recipient_ids || [])]));
  const others = ids.filter((id) => id !== currentUserId);
  if (others.length === 0) return labelFor(msg.sender_id);
  if (others.length === 1) return labelFor(others[0]);
  const [a, b, ...rest] = others;
  const left = `${labelFor(a)}, ${labelFor(b)}`;
  return rest.length ? `${left} +${rest.length}` : left;
}

function threadSidebarLabelFromMap(
  msg: Message,
  currentUserId: string | undefined,
  nameMap: Map<string, string>,
) {
  return threadSidebarLabel(msg, currentUserId, (id) => nameMap.get(id) || 'Unknown');
}

const AttachmentList: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => {
  const [preview, setPreview] = useState<{
    fileName: string;
    fileUrl: string;
    url: string;
    kind: 'image' | 'pdf';
    cleanup?: () => void;
  } | null>(null);

  const closePreview = () => {
    preview?.cleanup?.();
    setPreview(null);
  };

  const handleDownload = async (a: Attachment) => {
    const { ok, error: err } = await downloadInternalCommsAttachment(a.file_url, a.file_name);
    if (!ok) {
      notifications.show({
        title: 'Download failed',
        message: `${a.file_name}: ${err || 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const openPreview = async (a: Attachment) => {
    const filePath = extractInternalCommsStoragePath(a.file_url);
    if (!filePath) {
      notifications.show({
        title: 'Unable to preview',
        message: `${a.file_name}: missing storage path`,
        color: 'red',
      });
      return;
    }
    const { result, error } = await resolveInternalCommsFileAccess(filePath);
    if (!result || error) {
      notifications.show({
        title: 'Unable to preview',
        message: `${a.file_name}: ${error || 'Access denied'}`,
        color: 'red',
      });
      return;
    }
    const cleanup = result.kind === 'blob' ? result.revoke : undefined;
    const kind = attachmentLooksLikeImage(a.file_name, a.file_type)
      ? 'image'
      : 'pdf';
    setPreview({
      fileName: a.file_name,
      fileUrl: a.file_url,
      url: result.url,
      kind,
      cleanup,
    });
  };

  const openInNewTab = () => {
    if (!preview) return;
    window.open(preview.url, '_blank', 'noopener,noreferrer');
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <Group gap={6} mt={6} wrap="wrap">
        {attachments.map((a) => {
          const canPreview =
            attachmentLooksLikeImage(a.file_name, a.file_type) ||
            attachmentLooksLikePdf(a.file_name, a.file_type);
          return (
            <Paper key={a.id} withBorder px="xs" py={6} radius="sm" bg="gray.0">
              <Group gap={8} wrap="nowrap">
                {fileIcon(a.file_type)}
                <Text size="xs" truncate maw={160}>
                  {a.file_name}
                  {a.file_size_bytes ? ` · ${formatSize(a.file_size_bytes)}` : ''}
                </Text>
                <Group gap={4} wrap="nowrap">
                  {canPreview && (
                    <Tooltip label="Preview">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="orange"
                        onClick={() => void openPreview(a)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Download">
                    <ActionIcon
                      size="sm"
                      variant="light"
                      color="gray"
                      onClick={() => void handleDownload(a)}
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Group>

      <Modal
        opened={!!preview}
        onClose={closePreview}
        title={preview?.fileName}
        size="xl"
        radius="md"
      >
        {preview && (
          <Stack gap="md">
            {preview.kind === 'image' ? (
              <Box style={{ textAlign: 'center', maxHeight: '70vh', overflow: 'auto' }}>
                <img
                  src={preview.url}
                  alt={preview.fileName}
                  style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
                />
              </Box>
            ) : (
              <iframe
                title={preview.fileName}
                src={preview.url}
                style={{ width: '100%', height: '65vh', border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
              />
            )}
            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                leftSection={<IconExternalLink size={16} />}
                onClick={openInNewTab}
              >
                Open in new tab
              </Button>
              <Button
                color="orange"
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  void downloadInternalCommsAttachment(preview.fileUrl, preview.fileName);
                }}
              >
                Download
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
};

const useIsMobileComms = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

const MessagesTab: React.FC = () => {
  const isMobile = useIsMobileComms();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [composeMode, setComposeMode] = useState<'none' | 'new'>('none');
  const [userNameCache, setUserNameCache] = useState<Map<string, string>>(new Map());
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const labelForUserId = useCallback(
    (userId: string) => {
      const cached = userNameCache.get(userId);
      if (cached) return cached;
      return recipients.find((r) => r.user_id === userId)?.label || 'Unknown';
    },
    [recipients, userNameCache],
  );

  const composeForm = useForm({
    initialValues: { subject: '', body: '', recipients: [] as string[] },
    validate: {
      recipients: (v) => (!v?.length ? 'Select at least one recipient' : null),
      body: (v) => (!v?.trim() ? 'Enter a message' : null),
    },
  });

  const selectedMessageRef = useRef<Message | null>(null);
  const currentUserRef = useRef<any>(null);

  useEffect(() => {
    selectedMessageRef.current = selectedMessage;
  }, [selectedMessage]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const getNameMap = useCallback(async (userIds: string[]): Promise<Map<string, string>> => {
    if (userIds.length === 0) return new Map();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    const map = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      map.set(p.user_id, p.full_name || p.email || 'Unknown');
    });
    return map;
  }, []);

  const fetchAttachments = useCallback(async (messageIds: string[]): Promise<Map<string, Attachment[]>> => {
    const map = new Map<string, Attachment[]>();
    if (messageIds.length === 0) return map;
    const { data } = await supabase
      .from('internal_message_attachments')
      .select('id, message_id, file_name, file_url, file_size_bytes, file_type')
      .in('message_id', messageIds);
    (data || []).forEach((a: any) => {
      const list = map.get(a.message_id) || [];
      list.push(a);
      map.set(a.message_id, list);
    });
    return map;
  }, []);

  const fetchMessages = useCallback(async (viewerUserId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const allUserIds = new Set<string>();
        data.forEach((m: any) => {
          allUserIds.add(m.sender_id);
          (m.recipient_ids || []).forEach((id: string) => allUserIds.add(id));
        });

        const msgIds = data.map((m: any) => m.id);
        const [nameMap, attachMap] = await Promise.all([getNameMap([...allUserIds]), fetchAttachments(msgIds)]);
        const activeViewerId = viewerUserId ?? currentUserRef.current?.id ?? currentUser?.id;

        setUserNameCache((prev) => {
          const merged = new Map(prev);
          nameMap.forEach((v, k) => merged.set(k, v));
          return merged;
        });

        setMessages(
          data.map((m: any) => ({
            ...m,
            sender_name: nameMap.get(m.sender_id) || 'Unknown',
            thread_label: threadSidebarLabelFromMap(m, activeViewerId, nameMap),
            attachments: attachMap.get(m.id) || [],
          })),
        );
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, getNameMap, fetchAttachments]);

  const refreshThread = useCallback(
    async (parentId: string) => {
      const { data } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
        const msgIds = data.map((m: any) => m.id);
        const [nameMap, attachMap] = await Promise.all([getNameMap(senderIds), fetchAttachments(msgIds)]);

        setUserNameCache((prev) => {
          const merged = new Map(prev);
          nameMap.forEach((v, k) => merged.set(k, v));
          return merged;
        });

        setThreadMessages(
          data.map((m: any) => ({
            ...m,
            sender_name: nameMap.get(m.sender_id) || 'Unknown',
            attachments: attachMap.get(m.id) || [],
          })),
        );
      } else {
        setThreadMessages([]);
      }
    },
    [getNameMap, fetchAttachments],
  );

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: execs } = await supabase.from('exec_users').select('user_id, role, title');

      if (execs && execs.length > 0) {
        const userIds = execs.map((e: any) => e.user_id);
        const nameMap = await getNameMap(userIds);
        setRecipients(
          execs.map((e: any) => ({
            user_id: e.user_id,
            label: `${nameMap.get(e.user_id) || e.role} (${e.title || e.role})`,
          })),
        );
      }

      await fetchMessages(user?.id);
    };
    init();

    const channel = supabase
      .channel('internal-messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internal_messages' }, (payload) => {
        const newMsg = payload.new as any;
        const me = currentUserRef.current;

        if (me && newMsg.sender_id !== me.id) {
          playNotificationSound();
        }

        fetchMessages(currentUserRef.current?.id);

        const openThread = selectedMessageRef.current;
        if (openThread) {
          if (newMsg.parent_id === openThread.id || newMsg.id === openThread.id) {
            refreshThread(openThread.id);
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages(currentUserRef.current?.id);
        const openThread = selectedMessageRef.current;
        if (openThread) {
          refreshThread(openThread.id);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'internal_messages' }, () => {
        fetchMessages(currentUserRef.current?.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, getNameMap, refreshThread]);

  const uploadFiles = async (files: File[], messageId: string, userId: string) => {
    for (const file of files) {
      if (!file) continue;
      const filePath = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('internal-comms-files').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: attachError } = await supabase.from('internal_message_attachments').insert([
        {
          message_id: messageId,
          file_name: file.name,
          file_url: filePath,
          file_size_bytes: file.size,
          file_type: file.type,
          uploaded_by: userId,
        },
      ]);
      if (attachError) throw attachError;
    }
  };

  const handleSend = composeForm.onSubmit(async (values) => {
    if (!currentUser) return;
    setSending(true);
    try {
      const { data: msgData, error } = await supabase
        .from('internal_messages')
        .insert([
          {
            sender_id: currentUser.id,
            subject: values.subject || null,
            body: values.body,
            channel: (values.recipients?.length > 1 ? 'group' : 'direct') as 'direct' | 'group',
            recipient_ids: values.recipients,
            read_by: [currentUser.id],
          },
        ])
        .select('id')
        .single();
      if (error) throw error;

      if (composeFiles.length > 0) {
        await uploadFiles(composeFiles, msgData.id, currentUser.id);
      }

      notifications.show({ title: 'Message sent', message: '', color: 'green' });
      composeForm.reset();
      setComposeFiles([]);
      setComposeMode('none');
      await fetchMessages();
    } catch (err: any) {
      notifications.show({ title: 'Failed to send', message: err.message, color: 'red' });
    } finally {
      setSending(false);
    }
  });

  const openThread = async (msg: Message) => {
    setComposeMode('none');
    setSelectedMessage(msg);
    if (currentUser && !msg.read_by.includes(currentUser.id)) {
      // Immediately update local state so the dot disappears
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, read_by: [...m.read_by, currentUser.id] } : m
        )
      );
      await supabase
        .from('internal_messages')
        .update({
          read_by: [...msg.read_by, currentUser.id],
        })
        .eq('id', msg.id);
    }
    await refreshThread(msg.id);
  };

  const sendReply = async () => {
    if (!currentUser || !selectedMessage || (!replyBody.trim() && replyFiles.length === 0)) return;
    try {
      const participantIds = Array.from(new Set([selectedMessage.sender_id, ...(selectedMessage.recipient_ids || [])]));
      const replyRecipientIds = participantIds.filter((id) => id !== currentUser.id);

      if (replyRecipientIds.length === 0) {
        notifications.show({ title: 'No recipients', message: 'No recipients found for this conversation', color: 'red' });
        return;
      }

      const { data: msgData, error } = await supabase
        .from('internal_messages')
        .insert([
          {
            sender_id: currentUser.id,
            body: replyBody || '📎 Attachment',
            channel: (replyRecipientIds.length > 1 ? 'group' : 'direct') as 'direct' | 'group',
            parent_id: selectedMessage.id,
            recipient_ids: replyRecipientIds,
            read_by: [currentUser.id],
          },
        ])
        .select('id')
        .single();
      if (error) throw error;

      if (replyFiles.length > 0) {
        await uploadFiles(replyFiles, msgData.id, currentUser.id);
      }

      // Reset parent read_by so other participants see the unread dot
      await supabase
        .from('internal_messages')
        .update({ read_by: [currentUser.id] })
        .eq('id', selectedMessage.id);

      setReplyBody('');
      setReplyFiles([]);
      await refreshThread(selectedMessage.id);
    } catch (err: any) {
      notifications.show({ title: 'Failed to reply', message: err?.message, color: 'red' });
    }
  };

  const handleDelete = async (msgId: string, isParent: boolean) => {
    modals.openConfirmModal({
      title: 'Delete message?',
      children: (
        <Text size="sm">
          {isParent ? 'This will delete the message and all replies.' : 'This reply will be permanently deleted.'}
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          if (isParent) {
            await supabase
              .from('internal_message_attachments')
              .delete()
              .in('message_id', [msgId, ...threadMessages.map((t) => t.id)]);
            await supabase.from('internal_messages').delete().eq('parent_id', msgId);
            await supabase.from('internal_messages').delete().eq('id', msgId);
            setSelectedMessage(null);
            setThreadMessages([]);
            setComposeMode('none');
          } else {
            await supabase.from('internal_message_attachments').delete().eq('message_id', msgId);
            await supabase.from('internal_messages').delete().eq('id', msgId);
          }
          notifications.show({ title: 'Message deleted', message: '', color: 'green' });
        } catch (err: any) {
          notifications.show({ title: 'Delete failed', message: err.message, color: 'red' });
        }
      },
    });
  };

  const isUnread = (msg: Message) => currentUser && !msg.read_by.includes(currentUser.id);
  const hasAttachments = (msg: Message) => msg.attachments && msg.attachments.length > 0;

  const recipientOptions = recipients
    .filter((r) => r.user_id !== currentUser?.id)
    .map((r) => ({ value: r.user_id, label: r.label }));

  const feedMessages: Message[] = selectedMessage
    ? [selectedMessage, ...threadMessages]
    : [];

  useEffect(() => {
    if (!selectedMessage) return;
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessage?.id, threadMessages]);

  const startNewConversation = () => {
    setSelectedMessage(null);
    setThreadMessages([]);
    setReplyBody('');
    setReplyFiles([]);
    composeForm.reset();
    setComposeFiles([]);
    setComposeMode('new');
  };

  const renderSlackMessage = (msg: Message, opts: { isRoot: boolean }) => {
    const isMine = msg.sender_id === currentUser?.id;
    return (
      <Box key={msg.id} py={6}>
        <Group align="flex-start" wrap="nowrap" gap="sm">
          <Avatar size="md" radius="sm" color="orange" style={{ flexShrink: 0 }}>
            {msg.sender_name?.charAt(0).toUpperCase() || <IconUser size={18} />}
          </Avatar>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={8} wrap="nowrap" align="center">
              <Text fw={700} size="sm">
                {msg.sender_name}
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(msg.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </Text>
              {isMine && !opts.isRoot && (
                <Tooltip label="Delete message">
                  <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(msg.id, false)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
            {opts.isRoot && msg.subject ? (
              <Text size="xs" c="dimmed" fs="italic">
                {msg.subject}
              </Text>
            ) : null}
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
              {msg.body}
            </Text>
            <AttachmentList attachments={msg.attachments || []} />
          </Stack>
        </Group>
      </Box>
    );
  };

  // On mobile, show either the list or the thread/compose, not both
  const mobileShowThread = isMobile && (selectedMessage !== null || composeMode === 'new');

  const goBackToList = () => {
    setSelectedMessage(null);
    setThreadMessages([]);
    setComposeMode('none');
  };

  return (
    <Stack gap="sm" style={{ minHeight: isMobile ? 'calc(100vh - 200px)' : 520 }}>
      {!isMobile && (
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <IconMessages size={26} color="var(--mantine-color-orange-6)" style={{ flexShrink: 0, marginTop: 2 }} />
          <Stack gap={2}>
            <Title order={5}>Team messages</Title>
            <Text size="xs" c="dimmed" maw={520}>
              Slack-style direct messages between executives: pick a conversation on the left, scroll the thread, and reply at the bottom.
            </Text>
          </Stack>
        </Group>
      )}

      <Box
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          border: isMobile ? 'none' : '1px solid var(--mantine-color-gray-3)',
          borderRadius: isMobile ? 0 : 8,
          overflow: 'hidden',
          minHeight: isMobile ? 'calc(100vh - 240px)' : 460,
          background: 'var(--mantine-color-body)',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Sidebar — conversation list (hidden on mobile when viewing a thread) */}
        {(!isMobile || !mobileShowThread) && (
        <Box
          w={isMobile ? '100%' : 300}
          style={{
            flexShrink: 0,
            borderRight: '1px solid var(--mantine-color-gray-3)',
            background: 'var(--mantine-color-gray-0)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Group justify="space-between" p="sm" wrap="nowrap" gap="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              Direct messages
            </Text>
            <Tooltip label="New message">
              <ActionIcon
                variant="filled"
                color="orange"
                size="md"
                radius="md"
                onClick={startNewConversation}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Divider />
          <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {loading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : messages.length === 0 ? (
              <Text size="sm" c="dimmed" p="md">
                No conversations yet. Use + to message someone on the team.
              </Text>
            ) : (
              <Stack gap={4} p="xs">
                {messages.map((msg) => (
                  <UnstyledButton
                    key={msg.id}
                    onClick={() => void openThread(msg)}
                    w="100%"
                    p={8}
                    style={{
                      borderRadius: 8,
                      borderLeft: isUnread(msg) ? '3px solid var(--mantine-color-orange-6)' : '3px solid transparent',
                      background:
                        selectedMessage?.id === msg.id && composeMode === 'none'
                          ? 'var(--mantine-color-orange-0)'
                          : undefined,
                      textAlign: 'left',
                    }}
                  >
                    <Group wrap="nowrap" gap="sm" align="flex-start">
                      <Box pos="relative" style={{ flexShrink: 0 }}>
                        <Avatar size="sm" radius="sm" color="orange">
                          {threadSidebarLabel(msg, currentUser?.id, labelForUserId).charAt(0).toUpperCase()}
                        </Avatar>
                        {isUnread(msg) && (
                          <Box
                            style={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: 'var(--mantine-color-orange-6)',
                              border: '2px solid var(--mantine-color-gray-0)',
                            }}
                          />
                        )}
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap" justify="space-between">
                          <Text size="sm" fw={isUnread(msg) ? 700 : 500} truncate style={{ flex: 1 }}>
                            {threadSidebarLabel(msg, currentUser?.id, labelForUserId)}
                          </Text>
                          {hasAttachments(msg) && (
                            <IconPaperclip size={14} style={{ opacity: 0.55, flexShrink: 0 }} />
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                          {msg.body.length > 56 ? `${msg.body.slice(0, 56)}…` : msg.body}
                        </Text>
                      </Box>
                      {msg.channel === 'group' ? <IconHash size={14} style={{ opacity: 0.4, flexShrink: 0 }} /> : null}
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
        )}

        {/* Main pane (hidden on mobile when showing conversation list) */}
        {(!isMobile || mobileShowThread) && (
        <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {composeMode === 'new' ? (
            <>
              <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                <Group justify="space-between">
                  <Group gap="xs">
                    {isMobile && (
                      <ActionIcon variant="subtle" color="gray" onClick={goBackToList}>
                        <IconArrowLeft size={18} />
                      </ActionIcon>
                    )}
                    <Text fw={700}>New message</Text>
                  </Group>
                  <Button variant="subtle" size="xs" color="gray" onClick={goBackToList}>
                    Cancel
                  </Button>
                </Group>
              </Box>
              <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
                <form onSubmit={handleSend}>
                  <Stack gap="sm" maw={640}>
                    <MultiSelect
                      label="To"
                      description="One or more people (like a Slack DM or small group)"
                      data={recipientOptions}
                      value={composeForm.values.recipients}
                      onChange={(v) => composeForm.setFieldValue('recipients', v)}
                      error={composeForm.errors.recipients}
                      placeholder="Search people…"
                      searchable
                    />
                    <TextInput label="Subject" placeholder="Optional" {...composeForm.getInputProps('subject')} />
                    <Textarea
                      label="Message"
                      placeholder="Type your message…"
                      minRows={5}
                      {...composeForm.getInputProps('body')}
                    />
                    <FileInput
                      label="Attachments"
                      placeholder="Attach files"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt,.zip"
                      value={composeFiles.length ? composeFiles : null}
                      onChange={(files) => setComposeFiles(files || [])}
                      leftSection={<IconPaperclip size={16} />}
                    />
                    <Group justify="flex-end">
                      <Button type="submit" color="orange" leftSection={<IconSend size={16} />} loading={sending}>
                        Send
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Box>
            </>
          ) : selectedMessage ? (
            <>
              <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                  <Group gap="sm" wrap="nowrap">
                    {isMobile && (
                      <ActionIcon variant="subtle" color="gray" onClick={goBackToList} style={{ flexShrink: 0 }}>
                        <IconArrowLeft size={18} />
                      </ActionIcon>
                    )}
                    <Avatar size="md" radius="sm" color="orange">
                      {threadSidebarLabel(selectedMessage, currentUser?.id, labelForUserId).charAt(0).toUpperCase()}
                    </Avatar>
                    <Stack gap={2}>
                      <Text fw={700}>
                        {threadSidebarLabel(selectedMessage, currentUser?.id, labelForUserId)}
                      </Text>
                      <Group gap={8}>
                        {selectedMessage.channel === 'group' ? (
                          <Badge size="xs" variant="light" color="blue">
                            Group
                          </Badge>
                        ) : (
                          <Badge size="xs" variant="light" color="gray">
                            Direct
                          </Badge>
                        )}
                        {selectedMessage.subject ? (
                          <Text size="xs" c="dimmed" truncate maw={400}>
                            {selectedMessage.subject}
                          </Text>
                        ) : null}
                      </Group>
                    </Stack>
                  </Group>
                  {selectedMessage.sender_id === currentUser?.id && (
                    <Tooltip label="Delete entire conversation">
                      <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(selectedMessage.id, true)}>
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Box>

              <Box style={{ flex: 1, minHeight: 200, overflowY: 'auto', padding: '8px 16px 16px' }}>
                <Stack gap={0}>
                  {feedMessages.map((msg, i) => (
                    <React.Fragment key={msg.id}>
                      {i > 0 ? <Divider my="xs" /> : null}
                      {renderSlackMessage(msg, { isRoot: i === 0 })}
                    </React.Fragment>
                  ))}
                  <div ref={feedEndRef} />
                </Stack>
              </Box>

              <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)', background: 'var(--mantine-color-gray-0)' }}>
                <Stack gap="sm">
                  <Group align="flex-end" wrap="nowrap" gap="sm">
                    <Textarea
                      style={{ flex: 1 }}
                      placeholder="Reply to this conversation…"
                      minRows={2}
                      autosize
                      maxRows={6}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                    />
                    <Stack gap={6} style={{ flexShrink: 0 }}>
                      <FileInput
                        placeholder="Attach"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.txt,.zip"
                        value={replyFiles.length ? replyFiles : null}
                        onChange={(files) => setReplyFiles(files || [])}
                        leftSection={<IconPaperclip size={16} />}
                        size="sm"
                        w={140}
                      />
                      <Button
                        color="orange"
                        leftSection={<IconSend size={16} />}
                        onClick={() => void sendReply()}
                        disabled={!replyBody.trim() && replyFiles.length === 0}
                      >
                        Send
                      </Button>
                    </Stack>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Tip: Ctrl+Enter to send
                  </Text>
                  {replyFiles.length > 0 ? (
                    <Group gap="xs">
                      {replyFiles.map((f, i) => (
                        <Badge
                          key={`${f.name}-${i}`}
                          variant="light"
                          rightSection={
                            <ActionIcon
                              size="xs"
                              color="gray"
                              variant="transparent"
                              onClick={() => setReplyFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            >
                              ×
                            </ActionIcon>
                          }
                        >
                          {f.name}
                        </Badge>
                      ))}
                    </Group>
                  ) : null}
                </Stack>
              </Box>
            </>
          ) : (
            <Center style={{ flex: 1, minHeight: 280 }}>
              <Stack align="center" gap="md" maw={360}>
                <IconMessages size={48} stroke={1.25} color="var(--mantine-color-gray-5)" />
                <Text ta="center" fw={600}>
                  Select a conversation
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Choose a direct message on the left, or start a new one with the + button—same idea as Slack DMs.
                </Text>
                <Button color="orange" leftSection={<IconPlus size={18} />} onClick={startNewConversation}>
                  New message
                </Button>
              </Stack>
            </Center>
          )}
        </Box>
        )}
      </Box>
    </Stack>
  );
};

export default MessagesTab;
