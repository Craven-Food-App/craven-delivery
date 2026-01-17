// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Tag, Button, Switch, Space, Select, Typography, message, Input, Tabs, Divider } from 'antd';
import { ShieldCheck, UserCog, RefreshCw, Filter as FilterIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const { Option } = Select;
const { Text } = Typography;

interface Position {
  id: string;
  title: string;
  code: string;
  is_executive: boolean;
}

interface Permission {
  key: string;
  label: string;
  module: string;
  description?: string;
}

interface RolePermission {
  id?: string;
  position_id: string;
  permission_key: string;
  allowed: boolean;
}

interface UserOverride {
  id?: string;
  user_id: string;
  permission_key: string;
  allowed: boolean;
}

const PermissionsManagement: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([]);
  const [userOverrides, setUserOverrides] = useState<UserOverride[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: pos }, { data: perms }, { data: rp }, { data: ovrs }] = await Promise.all([
          supabase.from('positions').select('id,title,code,is_executive').eq('is_active', true).order('is_executive', { ascending: false }).order('title'),
          supabase.from('permissions').select('*').order('module').order('label'),
          supabase.from('role_permissions').select('*'),
          supabase.from('user_permission_overrides').select('*'),
        ]);

        setPositions(pos || []);
        setPermissions(perms || []);
        setRolePerms(rp || []);
        setUserOverrides(ovrs || []);

        // Load some users for overrides (limit for performance)
        const { data: up } = await supabase.from('user_profiles').select('user_id, email').order('created_at', { ascending: false }).limit(200);
        setUsers((up || []).map((u: any) => ({ id: u.user_id, email: u.email })));
      } catch (e) {
        console.error(e);
        message.error('Failed to load permissions data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roleMatrix = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const pos of positions) {
      map[pos.id] = {};
    }
    for (const rp of rolePerms) {
      if (!map[rp.position_id]) map[rp.position_id] = {};
      map[rp.position_id][rp.permission_key] = rp.allowed;
    }
    return map;
  }, [positions, rolePerms]);

  const userPerms = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const ov of userOverrides) {
      if (!map[ov.user_id]) map[ov.user_id] = {};
      map[ov.user_id][ov.permission_key] = ov.allowed;
    }
    return map;
  }, [userOverrides]);

  const setRolePermission = async (positionId: string, permissionKey: string, allowed: boolean) => {
    try {
      const existing = rolePerms.find(r => r.position_id === positionId && r.permission_key === permissionKey);
      if (existing) {
        const { error } = await supabase
          .from('role_permissions')
          .update({ allowed })
          .eq('id', existing.id);
        if (error) throw error;
        setRolePerms(prev => prev.map(r => r.id === existing.id ? { ...r, allowed } : r));
      } else {
        const { data, error } = await supabase
          .from('role_permissions')
          .insert([{ position_id: positionId, permission_key: permissionKey, allowed }])
          .select()
          .single();
        if (error) throw error;
        setRolePerms(prev => [...prev, data]);
      }
    } catch (e: any) {
      console.error(e);
      message.error('Failed to update role permission');
    }
  };

  const setUserOverride = async (userId: string, permissionKey: string, allowed: boolean) => {
    try {
      const existing = userOverrides.find(o => o.user_id === userId && o.permission_key === permissionKey);
      if (existing) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .update({ allowed })
          .eq('id', existing.id);
        if (error) throw error;
        setUserOverrides(prev => prev.map(o => o.id === existing.id ? { ...o, allowed } : o));
      } else {
        const { data, error } = await supabase
          .from('user_permission_overrides')
          .insert([{ user_id: userId, permission_key: permissionKey, allowed }])
          .select()
          .single();
        if (error) throw error;
        setUserOverrides(prev => [...prev, data]);
      }
    } catch (e: any) {
      console.error(e);
      message.error('Failed to update user override');
    }
  };

  const refreshEffective = async () => {
    try {
      const { error } = await supabase.rpc('refresh_effective_permissions');
      if (error) throw error;
      message.success('Effective permissions refreshed');
    } catch (e: any) {
      console.error(e);
      message.error('Failed to refresh effective permissions');
    }
  };

  const filteredPermissions = useMemo(() => {
    return (permissions || [])
      .filter(p => moduleFilter === 'all' || p.module === moduleFilter)
      .filter(p =>
        !searchText ||
        p.label.toLowerCase().includes(searchText.toLowerCase()) ||
        p.key.toLowerCase().includes(searchText.toLowerCase())
      );
  }, [permissions, moduleFilter, searchText]);

  const rolePermissionColumns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 140,
      render: (m: string) => <Tag color="blue">{m}</Tag>,
      fixed: 'left' as const,
    },
    {
      title: 'Permission',
      key: 'label',
      render: (p: Permission) => (
        <div>
          <div style={{ fontWeight: 600 }}>{p.label}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{p.key}</Text>
        </div>
      )
    },
    {
      title: 'Allowed',
      key: 'allowed',
      align: 'center' as const,
      width: 140,
      render: (p: Permission) => (
        <Switch
          checked={Boolean(selectedPositionId && roleMatrix[selectedPositionId]?.[p.key])}
          onChange={(checked) => {
            if (!selectedPositionId) return;
            setRolePermission(selectedPositionId, p.key, checked);
          }}
          disabled={!selectedPositionId}
        />
      )
    }
  ];

  const userOverrideColumns = [
    {
      title: 'Permission',
      key: 'perm',
      render: (p: Permission) => (
        <div>
          <div style={{ fontWeight: 600 }}>{p.label}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{p.key}</Text>
        </div>
      )
    },
    {
      title: 'Allowed',
      key: 'allowed',
      align: 'center' as const,
      render: (p: Permission) => (
        <Switch
          checked={Boolean(selectedUserId && userPerms[selectedUserId]?.[p.key])}
          onChange={(checked) => {
            if (!selectedUserId) return;
            setUserOverride(selectedUserId, p.key, checked);
          }}
          disabled={!selectedUserId}
        />
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 8 }}>
      <Card
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 16 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size={12} style={{ alignItems: 'center' }}>
              <ShieldCheck style={{ width: 22, height: 22, color: '#ff7a45' }} />
              <span style={{ fontSize: 18, fontWeight: 600 }}>Permissions</span>
              <Divider type="vertical" />
              <Space size={8}>
                <FilterIcon size={16} color="#9aa0a6" />
                <Select
                  value={moduleFilter}
                  onChange={setModuleFilter}
                  size="small"
                  style={{ minWidth: 160 }}
                >
                  <Option value="all">All Modules</Option>
                  {[...new Set(permissions.map(p => p.module))].map(m => (
                    <Option key={m} value={m}>{m}</Option>
                  ))}
                </Select>
                <Input.Search
                  allowClear
                  placeholder="Search permission..."
                  size="small"
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 220 }}
                />
              </Space>
            </Space>
            <Space>
              <Button onClick={refreshEffective} icon={<RefreshCw size={14} />}>Refresh Effective</Button>
            </Space>
          </div>
        }
      >
        <Tabs
          defaultActiveKey="roles"
          items={[
            {
              key: 'roles',
              label: 'Role Permissions',
              children: (
                <div>
                  <Space style={{ marginBottom: 12 }}>
                    <Select
                      placeholder="Select position"
                      value={selectedPositionId}
                      onChange={setSelectedPositionId}
                      showSearch
                      style={{ minWidth: 320 }}
                      optionFilterProp="children"
                      filterOption={(input, option) => (option?.children as string)?.toLowerCase().includes(input.toLowerCase())}
                    >
                      {positions.map(p => (
                        <Option key={p.id} value={p.id}>{p.title} {p.is_executive ? '(Executive)' : ''}</Option>
                      ))}
                    </Select>
                  </Space>
                  <Table
                    bordered
                    columns={rolePermissionColumns}
                    dataSource={filteredPermissions}
                    rowKey={(p) => p.key}
                    loading={loading}
                    size="middle"
                    pagination={{ pageSize: 14, showSizeChanger: false }}
                    scroll={{ x: 720, y: 520 }}
                    sticky
                  />
                </div>
              )
            },
            {
              key: 'users',
              label: 'User Overrides',
              children: (
                <div>
                  <Space style={{ marginBottom: 12 }}>
                    <UserCog size={18} color="#ff7a45" />
                    <Select
                      showSearch
                      placeholder="Select user"
                      style={{ minWidth: 260 }}
                      value={selectedUserId || undefined}
                      onChange={setSelectedUserId}
                      filterOption={(input, option) => (option?.children as string)?.toLowerCase().includes(input.toLowerCase())}
                    >
                      {users.map(u => (
                        <Option key={u.id} value={u.id}>{u.email}</Option>
                      ))}
                    </Select>
                    <Button onClick={refreshEffective} icon={<RefreshCw size={14} />}>Refresh Effective</Button>
                  </Space>
                  <Table
                    rowKey={(p) => p.key}
                    columns={userOverrideColumns}
                    dataSource={filteredPermissions}
                    loading={loading}
                    size="middle"
                    pagination={{ pageSize: 12, showSizeChanger: false }}
                    scroll={{ x: 720, y: 520 }}
                    sticky
                  />
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default PermissionsManagement;


