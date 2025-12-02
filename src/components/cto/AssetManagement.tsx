import React, { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  Title,
  Button,
  Modal,
  TextInput,
  Select,
  Grid,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useEmbeddedToast';
import { MantineTable } from '@/components/cfo/MantineTable';
import { modals } from '@mantine/modals';
import { useForm } from '@mantine/form';
import { Text } from '@mantine/core';

export const AssetManagement: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
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
    try {
      const { data, error } = await supabase
        .from('it_assets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAsset(null);
    form.reset();
    setModalOpened(true);
  };

  const handleEdit = (record: any) => {
    setEditingAsset(record);
    form.setValues(record);
    setModalOpened(true);
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
      setModalOpened(false);
      form.reset();
      fetchAssets();
    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast.error(error.message || 'Failed to save asset', 'Error');
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>IT Assets</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
          Add Asset
        </Button>
      </Group>

      <MantineTable
        data={assets}
        loading={loading}
        rowKey="id"
        columns={[
          { title: 'Asset Name', dataIndex: 'asset_name' },
          { title: 'Type', dataIndex: 'asset_type' },
          { title: 'Status', dataIndex: 'status' },
          { title: 'Purchase Date', dataIndex: 'purchase_date' },
          { title: 'Warranty Expires', dataIndex: 'warranty_expiry' },
          {
            title: 'Actions',
            dataIndex: 'actions',
            render: (_: any, record: any) => (
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(record)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(record.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ),
          },
        ]}
      />

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingAsset ? 'Edit Asset' : 'Add Asset'}
      >
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
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
};











