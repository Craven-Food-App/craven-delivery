// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Card, Table, InputNumber, Button, Space, message, Tag } from 'antd';
import { supabase } from '@/integrations/supabase/client';
import { getExecutiveData } from '@/utils/getExecutiveData';

interface RowItem {
  key: string;
  full_name: string;
  role: string;
  email: string;
  employee_id?: string;
  equity_percent?: number;
  shares_issued?: number;
  strike_price?: number;
}

const EquityManagement: React.FC = () => {
  const [rows, setRows] = useState<RowItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await getExecutiveData();
      const mapped: RowItem[] = data.map(d => ({
        key: d.id,
        full_name: d.full_name,
        role: d.title || d.role?.toUpperCase(),
        email: d.email,
        employee_id: d.employee_id,
        equity_percent: d.equity_percent,
        shares_issued: d.shares_issued,
        strike_price: d.strike_price,
      }));
      setRows(mapped);
    })();
  }, []);

  const saveRow = async (r: RowItem) => {
    try {
      if (!r.employee_id) {
        message.error('Missing employee_id for update');
        return;
      }
      setSavingId(r.key);

      // Try update; if no row exists, insert
      const { data: existing, error: fetchErr } = await supabase
        .from('employee_equity')
        .select('id')
        .eq('employee_id', r.employee_id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      if (existing?.id) {
        const { error } = await supabase
          .from('employee_equity')
          .update({
            shares_percentage: r.equity_percent ?? null,
            shares_total: r.shares_issued ?? null,
            strike_price: r.strike_price ?? null,
          })
          .eq('employee_id', r.employee_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_equity')
          .insert({
            employee_id: r.employee_id,
            shares_percentage: r.equity_percent ?? 0,
            shares_total: r.shares_issued ?? 0,
            strike_price: r.strike_price ?? 0,
            equity_type: 'Stock',
          });
        if (error) throw error;
      }

      message.success(`Saved equity for ${r.full_name}`);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  const columns = [
    { title: 'Executive', dataIndex: 'full_name', key: 'full_name', render: (t: string, r: RowItem) => (
      <div>
        <div style={{ fontWeight: 600 }}>{t}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{r.email}</div>
      </div>
    )},
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: string) => (
      <Tag color="orange" style={{ fontWeight: 600 }}>{role}</Tag>
    )},
    { title: 'Equity %', dataIndex: 'equity_percent', key: 'equity_percent', render: (v: number, r: RowItem) => (
      <InputNumber min={0} max={100} value={v} onChange={(val) => setRows(prev => prev.map(p => p.key === r.key ? { ...p, equity_percent: val as number } : p))} />
    )},
    { title: 'Shares', dataIndex: 'shares_issued', key: 'shares_issued', render: (v: number, r: RowItem) => (
      <InputNumber min={0} value={v} onChange={(val) => setRows(prev => prev.map(p => p.key === r.key ? { ...p, shares_issued: val as number } : p))} />
    )},
    { title: 'Strike', dataIndex: 'strike_price', key: 'strike_price', render: (v: number, r: RowItem) => (
      <InputNumber min={0} step={0.0001} value={v as number} onChange={(val) => setRows(prev => prev.map(p => p.key === r.key ? { ...p, strike_price: val as number } : p))} />
    )},
    { title: 'Actions', key: 'actions', render: (_: any, r: RowItem) => (
      <Button type="primary" onClick={() => saveRow(r)} loading={savingId === r.key}>Save</Button>
    )},
  ];

  return (
    <Card title="Equity Management" style={{ borderRadius: 12 }}>
      <Table columns={columns} dataSource={rows} rowKey="key" pagination={{ pageSize: 10 }} />
    </Card>
  );
};

export default EquityManagement;
