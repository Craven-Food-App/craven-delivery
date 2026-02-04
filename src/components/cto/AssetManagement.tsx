// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Grid,
  Tabs,
  Card,
  Text,
} from '@mantine/core';
import { IconPlus, IconDatabase } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { PageHeader } from '@/components/tpi/PageHeader';
import { DataTable, ColumnDef } from '@/components/tpi/DataTable';
import { DetailDrawer } from '@/components/tpi/DetailDrawer';
import { FilterBar, Filter } from '@/components/tpi/FilterBar';
import { StatusBadge } from '@/components/tpi/StatusBadge';
import { EmptyState } from '@/components/tpi/EmptyState';
import { ErrorState } from '@/components/tpi/ErrorState';

export const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const toast = useToast();

  const form = useForm({
    initialValues: {
      asset_name: '',
      asset_type: 'hardware',
      status: 'active',
      purchase_date: '',
      warranty_expiry: '',
    },
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('it_assets')
        .select('*', { count: 'exact' });

      // Apply filters
      activeFilters.forEach((filter) => {
        if (filter.value) {
          if (filter.type === 'text') {
            query = query.ilike(filter.id, `%${filter.value}%`);
          } else if (filter.type === 'select') {
            query = query.eq(filter.id, filter.value);
          }
        }
      });

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;
      setAssets(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.message || 'Failed to load assets');
      toast.error('Failed to load assets', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAsset(null);
    form.reset();
    setSelectedAsset(null);
    setDrawerOpen(true);
  };

  const handleRowClick = (row: any) => {
    setSelectedAsset(row.id);
    setEditingAsset(null);
    setDrawerOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingAsset(record);
    form.setValues(record);
    setSelectedAsset(record.id);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    modals.openConfirmModal({
      title: 'Delete Asset',
      children: <Text size="sm">Are you sure you want to delete this asset?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('it_assets').delete().eq('id', id);
          if (error) throw error;
          toast.success('Asset deleted successfully', 'Success');
          fetchAssets();
        } catch (error: any) {
          console.error('Error deleting asset:', error);
          toast.error(error.message || 'Failed to delete asset', 'Error');
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('it_assets')
          .update(values)
          .eq('id', editingAsset.id);
        if (error) throw error;
        toast.success('Asset updated successfully', 'Success');
      } else {
        const { error } = await supabase.from('it_assets').insert(values);
        if (error) throw error;
        toast.success('Asset created successfully', 'Success');
      }
      setDrawerOpen(false);
      setEditingAsset(null);
      setSelectedAsset(null);
      form.reset();
      fetchAssets();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error(error.message || 'Failed to save asset', 'Error');
    }
  };

  const getStatusStatus = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'retired': return 'neutral';
      default: return 'neutral';
    }
  };

  const availableFilters: Filter[] = useMemo(() => [
    {
      id: 'asset_name',
      type: 'text',
      label: 'Asset Name',
      value: activeFilters.find((f) => f.id === 'asset_name')?.value || '',
    },
    {
      id: 'asset_type',
      type: 'select',
      label: 'Type',
      value: activeFilters.find((f) => f.id === 'asset_type')?.value || '',
      options: [
        { label: 'Hardware', value: 'hardware' },
        { label: 'Software', value: 'software' },
        { label: 'Server', value: 'server' },
        { label: 'Network', value: 'network' },
        { label: 'Mobile', value: 'mobile' },
      ],
    },
    {
      id: 'status',
      type: 'select',
      label: 'Status',
      value: activeFilters.find((f) => f.id === 'status')?.value || '',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Retired', value: 'retired' },
      ],
    },
  ], [activeFilters]);

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'asset_name',
      header: 'Asset Name',
      accessor: (row) => row.asset_name,
      sortable: true,
    },
    {
      id: 'asset_type',
      header: 'Type',
      accessor: (row) => row.asset_type,
      sortable: true,
      width: 120,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.status,
      sortable: true,
      render: (value) => (
        <StatusBadge
          status={getStatusStatus(value)}
          label={value.charAt(0).toUpperCase() + value.slice(1)}
          size="sm"
        />
      ),
      width: 120,
    },
    {
      id: 'purchase_date',
      header: 'Purchase Date',
      accessor: (row) => row.purchase_date,
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
      width: 150,
    },
    {
      id: 'warranty_expiry',
      header: 'Warranty Expires',
      accessor: (row) => row.warranty_expiry,
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : '-',
      width: 150,
    },
  ], []);

  const selectedAssetData = useMemo(() => {
    return assets.find((asset) => asset.id === selectedAsset);
  }, [assets, selectedAsset]);

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortColumn, sortDirection, activeFilters]);

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting assets as ${format.toUpperCase()}...`, 'Export');
  };

  if (error && !loading) {
    return (
      <ErrorState
        message={error}
        retry={{
          label: 'Retry',
          onRetry: fetchAssets,
        }}
      />
    );
  }

  return (
    <Stack gap="md">
      <PageHeader
        title="IT Asset Management"
        description="Track and manage IT assets, hardware, and software"
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            Add Asset
          </Button>
        }
      />

      <FilterBar
        filters={availableFilters}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      <DataTable
        data={assets}
        columns={columns}
        loading={loading}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: totalCount,
          onPageChange: setCurrentPage,
          onPageSizeChange: setPageSize,
        }}
        sorting={{
          column: sortColumn,
          direction: sortDirection,
          onSort: (col, dir) => {
            setSortColumn(col);
            setSortDirection(dir);
          },
        }}
        onRowClick={handleRowClick}
        exportable
        onExport={handleExport}
        emptyState={
          <EmptyState
            icon={IconDatabase}
            title="No assets found"
            description="Get started by adding your first IT asset."
            action={{
              label: 'Add Asset',
              onClick: handleCreate,
            }}
          />
        }
        getRowId={(row) => row.id}
      />

      <DetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedAsset(null);
          setEditingAsset(null);
        }}
        title={editingAsset ? 'Edit Asset' : selectedAssetData ? `Asset: ${selectedAssetData.asset_name}` : 'New Asset'}
        entityId={selectedAsset || undefined}
        width={700}
        footer={
          editingAsset ? (
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => {
                setEditingAsset(null);
                setDrawerOpen(false);
              }}>
                Cancel
              </Button>
              <Button onClick={() => form.onSubmit(handleSubmit)()}>
                Save Changes
              </Button>
            </Group>
          ) : selectedAssetData ? (
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={() => handleDelete(selectedAssetData.id)}>
                Delete
              </Button>
              <Button onClick={() => handleEdit(selectedAssetData)}>
                Edit
              </Button>
            </Group>
          ) : null
        }
      >
        {editingAsset ? (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Asset Name"
                placeholder="MacBook Pro 16"
                required
                {...form.getInputProps('asset_name')}
              />
              <Select
                label="Type"
                required
                data={[
                  { value: 'hardware', label: 'Hardware' },
                  { value: 'software', label: 'Software' },
                  { value: 'server', label: 'Server' },
                  { value: 'network', label: 'Network' },
                  { value: 'mobile', label: 'Mobile' },
                ]}
                {...form.getInputProps('asset_type')}
              />
              <Select
                label="Status"
                required
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'retired', label: 'Retired' },
                ]}
                {...form.getInputProps('status')}
              />
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Purchase Date"
                    type="date"
                    {...form.getInputProps('purchase_date')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Warranty Expires"
                    type="date"
                    {...form.getInputProps('warranty_expiry')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </form>
        ) : selectedAssetData ? (
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview" pt="md">
              <Card padding="md" withBorder>
                <Stack gap="sm">
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>Asset Name</Text>
                    <Text fw={500}>{selectedAssetData.asset_name}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>Type</Text>
                    <Text>{selectedAssetData.asset_type}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" fw={500}>Status</Text>
                    <StatusBadge
                      status={getStatusStatus(selectedAssetData.status)}
                      label={selectedAssetData.status.charAt(0).toUpperCase() + selectedAssetData.status.slice(1)}
                    />
                  </div>
                  {selectedAssetData.purchase_date && (
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Purchase Date</Text>
                      <Text>{new Date(selectedAssetData.purchase_date).toLocaleDateString()}</Text>
                    </div>
                  )}
                  {selectedAssetData.warranty_expiry && (
                    <div>
                      <Text size="xs" c="dimmed" fw={500}>Warranty Expires</Text>
                      <Text>{new Date(selectedAssetData.warranty_expiry).toLocaleDateString()}</Text>
                    </div>
                  )}
                </Stack>
              </Card>
            </Tabs.Panel>
          </Tabs>
        ) : (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Asset Name"
                placeholder="MacBook Pro 16"
                required
                {...form.getInputProps('asset_name')}
              />
              <Select
                label="Type"
                required
                data={[
                  { value: 'hardware', label: 'Hardware' },
                  { value: 'software', label: 'Software' },
                  { value: 'server', label: 'Server' },
                  { value: 'network', label: 'Network' },
                  { value: 'mobile', label: 'Mobile' },
                ]}
                {...form.getInputProps('asset_type')}
              />
              <Select
                label="Status"
                required
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'retired', label: 'Retired' },
                ]}
                {...form.getInputProps('status')}
              />
              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Purchase Date"
                    type="date"
                    {...form.getInputProps('purchase_date')}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Warranty Expires"
                    type="date"
                    {...form.getInputProps('warranty_expiry')}
                  />
                </Grid.Col>
              </Grid>
            </Stack>
          </form>
        )}
      </DetailDrawer>
    </Stack>
  );
};













