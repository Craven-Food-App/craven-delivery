// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Table, Space, Button, Modal, Form, Input, Typography, Row, Col, message, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';

export function MessageCenter() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [form] = Form.useForm();
  const channelRef = useRef<any>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'unread'|'mentions'>('all');

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('message_threads')
        .select('id, subject, created_at, created_by')
        .order('created_at', { ascending: false });
      setThreads((data || []).map((t:any)=> ({ key: t.id, ...t })));
    } finally { setLoading(false); }
  }

  async function openThread(thread: any) {
    setSelectedThread(thread);
    setLoading(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('id, thread_id, sender_label, body, created_at')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      setMessagesList((data || []).map((m:any)=> ({ key: m.id, ...m })));
    } finally { setLoading(false); }

    // Realtime subscribe to new messages in this thread
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    channelRef.current = supabase
      .channel(`messages-thread-${thread.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${thread.id}` }, async (payload) => {
        setMessagesList((prev) => [...prev, { key: payload.new.id, ...payload.new }]);
      })
      .subscribe();
  }

  async function sendReply() {
    if (!selectedThread || !reply.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({ thread_id: selectedThread.id, body: reply, sender_label: 'You' });
      if (error) throw error;
      // Upload attachments to storage bucket 'message-attachments'
      if (files.length) {
        setUploading(true);
        for (const f of files) {
          const path = `${selectedThread.id}/${Date.now()}_${f.name}`;
          const { data: up, error: upErr } = await supabase.storage.from('message-attachments').upload(path, f.originFileObj, { upsert: false, contentType: f.type });
          if (!upErr && up) {
            const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(path);
            await supabase.from('message_attachments').insert({ message_id: (await latestMessageId(selectedThread.id))!, file_url: urlData.publicUrl, file_name: f.name, content_type: f.type, file_size: f.size });
          }
        }
        setFiles([]);
        setUploading(false);
      }
      setReply('');
      // messages are appended via realtime; ensure scroll can be adjusted by consumer
    } finally { setLoading(false); }
  }

  async function latestMessageId(threadId: string): Promise<string | null> {
    const { data } = await supabase.from('messages').select('id').eq('thread_id', threadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data?.id || null;
  }

  const filteredThreads = threads.filter(t => {
    const hay = `${t.subject || ''}`.toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (filter === 'unread') return !!t.unread;
    if (filter === 'mentions') return /@\w+/.test(t.preview || '');
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_420px_1fr] gap-3 lg:gap-6" style={{ minHeight: 520 }}>
      {/* Left: Folders/Shortcuts */}
      <div className="hidden lg:block" style={{ borderRight:'1px solid #e5e7eb', paddingRight:12 }}>
        <Space direction="vertical" style={{ width:'100%' }}>
          <Button type="primary" block onClick={()=> setComposeOpen(true)}>New Message</Button>
          <Input.Search placeholder="Search" allowClear onSearch={setSearch} onChange={(e)=> setSearch(e.target.value)} />
          <Space.Compact className="w-full">
            <Button className="flex-1" type={filter==='all'?'primary':'default'} onClick={()=> setFilter('all')}>All</Button>
            <Button className="flex-1" type={filter==='unread'?'primary':'default'} onClick={()=> setFilter('unread')}>Unread</Button>
            <Button className="flex-1" type={filter==='mentions'?'primary':'default'} onClick={()=> setFilter('mentions')}>Mentions</Button>
          </Space.Compact>
          <div style={{ fontSize:12, color:'#64748b', marginTop:8 }}>Folders</div>
          <Space direction="vertical" style={{ width:'100%' }}>
            <Button block>Inbox</Button>
            <Button block>Sent</Button>
            <Button block>Drafts</Button>
            <Button block>Archive</Button>
          </Space>
        </Space>
      </div>

      {/* Mobile: Simplified top bar */}
      <div className="lg:hidden mb-4 space-y-2">
        <Button type="primary" block onClick={()=> setComposeOpen(true)}>New Message</Button>
        <Input.Search placeholder="Search" allowClear onSearch={setSearch} onChange={(e)=> setSearch(e.target.value)} />
        <Space.Compact className="w-full">
          <Button className="flex-1" type={filter==='all'?'primary':'default'} onClick={()=> setFilter('all')}>All</Button>
          <Button className="flex-1" type={filter==='unread'?'primary':'default'} onClick={()=> setFilter('unread')}>Unread</Button>
          <Button className="flex-1" type={filter==='mentions'?'primary':'default'} onClick={()=> setFilter('mentions')}>Mentions</Button>
        </Space.Compact>
      </div>

      {/* Middle: Thread list */}
      <div className={`${selectedThread && 'hidden lg:block'}`} style={{ borderRight:'1px solid #e5e7eb', paddingRight:12, overflow:'auto' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 sm:mb-2">
          <Typography.Text strong>Conversations</Typography.Text>
          <Button size="small" onClick={loadThreads}>Refresh</Button>
        </div>
        <div>
          {filteredThreads.map(t => (
            <div key={t.key} onClick={()=> openThread(t)} className="p-2 sm:p-2.5 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors" style={{ background: selectedThread?.id===t.id? '#eff6ff':'transparent' }}>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <div className="font-semibold text-sm sm:text-base" style={{ fontWeight: t.unread? 700: 500 }}>{t.subject || '(No subject)'}</div>
                <div className="text-xs text-slate-500">{new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
              </div>
              {t.preview && <div className="text-xs sm:text-sm text-slate-500 truncate">{t.preview}</div>}
            </div>
          ))}
          {!filteredThreads.length && <div className="text-slate-400 text-sm">No conversations.</div>}
        </div>
      </div>

      {/* Right: Reading Pane */}
      <div className={!selectedThread ? 'hidden lg:block' : ''}>
        {selectedThread ? (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <Typography.Title level={5} className="!mb-0 text-base sm:text-lg">{selectedThread.subject}</Typography.Title>
              <Space className="w-full sm:w-auto flex flex-wrap">
                <Button size="small">Reply</Button>
                <Button size="small">Forward</Button>
                <Button size="small" danger>Delete</Button>
              </Space>
            </div>
            <div className="border border-slate-200 rounded-lg p-3 sm:p-4 mb-4" style={{ maxHeight: 380, overflow:'auto' }}>
              {messagesList.map(m => (
                <div key={m.id} className="mb-3 sm:mb-4">
                  <div className="text-xs text-slate-500 mb-1">{m.sender_label} • {new Date(m.created_at).toLocaleString()}</div>
                  <div className="text-sm sm:text-base">{renderMentions(m.body)}</div>
                  {m.attachments?.length ? (
                    <div className="mt-2">
                      {m.attachments.map((a:any)=> (
                        <div key={a.file_url}><a href={a.file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">{a.file_name || 'attachment'}</a></div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input.TextArea value={reply} onChange={(e)=> setReply(e.target.value)} placeholder="Write a reply..." rows={2} />
              <Upload
                multiple
                beforeUpload={() => false}
                fileList={files}
                onChange={({ fileList }) => setFiles(fileList)}
              >
                <Button icon={<UploadOutlined />}>Attach</Button>
              </Upload>
              <Button type="primary" loading={uploading} onClick={sendReply}>Send</Button>
            </Space.Compact>
          </div>
        ) : (
          <div style={{ color:'#64748b' }}>Select a conversation to view.</div>
        )}
      </div>

      <ComposeModal open={composeOpen} onClose={()=> setComposeOpen(false)} onCreated={async (threadId)=> { setComposeOpen(false); await loadThreads(); }} />
    </div>
  );
}

function ComposeModal({ open, onClose, onCreated }: { open: boolean; onClose: ()=>void; onCreated: (id:string)=>void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  return (
    <Modal
      title="New Message"
      open={open}
      onCancel={onClose}
      onOk={async () => {
        const vals = await form.validateFields();
        setLoading(true);
        try {
          const { data: t, error: e1 } = await supabase.from('message_threads').insert({ subject: vals.subject }).select('id').single();
          if (e1) throw e1;
          await supabase.from('messages').insert({ thread_id: t.id, sender_label: 'You', body: vals.body });
          const recipients = (vals.recipients || '').split(',').map((s:string)=> s.trim()).filter(Boolean);
          if (recipients.length) {
            await supabase.from('message_participants').insert(recipients.map((r:string)=> ({ thread_id: t.id, user_label: r })));
          }
          // attachments upload
          for (const f of files) {
            const path = `${t.id}/${Date.now()}_${f.name}`;
            const { data: up, error: upErr } = await supabase.storage.from('message-attachments').upload(path, f.originFileObj, { upsert: false, contentType: f.type });
            if (!upErr && up) {
              const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(path);
              const lastId = await (async()=>{
                const { data: m } = await supabase.from('messages').select('id').eq('thread_id', t.id).order('created_at', { ascending: false }).limit(1).single();
                return m?.id;
              })();
              if (lastId) await supabase.from('message_attachments').insert({ message_id: lastId, file_url: urlData.publicUrl, file_name: f.name, content_type: f.type, file_size: f.size });
            }
          }
          onCreated(t.id);
          form.resetFields();
          setFiles([]);
        } finally { setLoading(false); }
      }}
      confirmLoading={loading}
    >
      <Form layout="vertical" form={form}>
        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
          <Input placeholder="Subject" />
        </Form.Item>
        <Form.Item name="recipients" label="Recipients" tooltip="Comma-separated emails or names">
          <Input placeholder="email1@example.com, email2@example.com" />
        </Form.Item>
        <Form.Item name="body" label="Message" rules={[{ required: true }]}>
          <Input.TextArea rows={4} placeholder="Write your message..." />
        </Form.Item>
        <Upload multiple beforeUpload={() => false} fileList={files} onChange={({ fileList }) => setFiles(fileList)}>
          <Button icon={<UploadOutlined />}>Attach files</Button>
        </Upload>
      </Form>
    </Modal>
  );
}
