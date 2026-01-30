// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UploadCloud,
  File,
  Edit,
  Trash2,
  Eye,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface PitchDeck {
  id: string;
  name: string;
  description: string;
  file_url: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const PitchDeckManager: React.FC = () => {
  const { toast } = useToast();
  const [decks, setDecks] = useState<PitchDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [newDeckFile, setNewDeckFile] = useState<File | null>(null);
  const [editDeck, setEditDeck] = useState<PitchDeck | null>(null);
  const [editDeckName, setEditDeckName] = useState('');
  const [editDeckDescription, setEditDeckDescription] = useState('');
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPitchDecks();
  }, []);

  const fetchPitchDecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pitch_decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDecks(data || []);
    } catch (error: any) {
      console.error('Error fetching pitch decks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pitch decks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setNewDeckFile(event.target.files[0]);
    }
  };

  const uploadPitchDeck = async () => {
    if (!newDeckName || !newDeckDescription || !newDeckFile) {
      toast({
        title: 'Error',
        description: 'Please fill all fields and select a file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const filePath = `pitch_decks/${Date.now()}-${newDeckFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, newDeckFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const publicURL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${filePath}`;

      const { error: insertError } = await supabase
        .from('pitch_decks')
        .insert({
          name: newDeckName,
          description: newDeckDescription,
          file_url: publicURL,
          status: 'active',
        });

      if (insertError) throw insertError;

      await fetchPitchDecks();
      setNewDeckName('');
      setNewDeckDescription('');
      setNewDeckFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the file input
      }

      toast({
        title: 'Success',
        description: 'Pitch deck uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading pitch deck:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload pitch deck',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const updatePitchDeck = async () => {
    if (!editDeck) return;

    try {
      const { error } = await supabase
        .from('pitch_decks')
        .update({
          name: editDeckName,
          description: editDeckDescription,
        })
        .eq('id', editDeck.id);

      if (error) throw error;

      await fetchPitchDecks();
      setEditDeck(null);
      toast({
        title: 'Success',
        description: 'Pitch deck updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating pitch deck:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pitch deck',
        variant: 'destructive',
      });
    }
  };

  const togglePitchDeckStatus = async (deck: PitchDeck) => {
    try {
      const newStatus = deck.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('pitch_decks')
        .update({ status: newStatus })
        .eq('id', deck.id);

      if (error) throw error;

      await fetchPitchDecks();
      toast({
        title: 'Success',
        description: `Pitch deck ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      console.error('Error toggling pitch deck status:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle pitch deck status',
        variant: 'destructive',
      });
    }
  };

  const confirmDeletePitchDeck = (deckId: string) => {
    setDeleteDeckId(deckId);
  };

  const cancelDeletePitchDeck = () => {
    setDeleteDeckId(null);
  };

  const deletePitchDeck = async () => {
    if (!deleteDeckId) return;

    try {
      const { error } = await supabase
        .from('pitch_decks')
        .delete()
        .eq('id', deleteDeckId);

      if (error) throw error;

      await fetchPitchDecks();
      setDeleteDeckId(null);
      toast({
        title: 'Success',
        description: 'Pitch deck deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting pitch deck:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete pitch deck',
        variant: 'destructive',
      });
    }
  };

  const filteredDecks = decks.filter(deck => {
    if (statusFilter === 'all') return true;
    return deck.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading pitch decks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pitch Deck Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage and upload pitch decks for internal and external use
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Pitch Deck</CardTitle>
          <CardDescription>
            Upload a new pitch deck to make it available for use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Pitch Deck Name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Pitch Deck Description"
              value={newDeckDescription}
              onChange={(e) => setNewDeckDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="file">File</Label>
            <Input
              type="file"
              id="file"
              onChange={handleFileSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              {newDeckFile ? newDeckFile.name : 'Select File'}
            </Button>
            {newDeckFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected file: {newDeckFile.name}
              </p>
            )}
          </div>
          <Button onClick={uploadPitchDeck} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Upload Pitch Deck
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Pitch Decks</CardTitle>
          <CardDescription>
            Manage existing pitch decks and their statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="pb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No pitch decks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDecks.map((deck) => (
                  <TableRow key={deck.id}>
                    <TableCell className="font-medium">{deck.name}</TableCell>
                    <TableCell>{deck.description}</TableCell>
                    <TableCell>
                      {deck.status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          Inactive
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(deck.file_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = deck.file_url;
                            link.download = deck.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditDeck(deck);
                            setEditDeckName(deck.name);
                            setEditDeckDescription(deck.description);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePitchDeckStatus(deck)}
                        >
                          {deck.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeletePitchDeck(deck.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Pitch Deck Dialog */}
      <Dialog open={!!editDeck} onOpenChange={() => setEditDeck(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pitch Deck</DialogTitle>
            <DialogDescription>
              Update the name and description of the pitch deck
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Pitch Deck Name"
                value={editDeckName}
                onChange={(e) => setEditDeckName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                placeholder="Pitch Deck Description"
                value={editDeckDescription}
                onChange={(e) => setEditDeckDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setEditDeck(null)}>
              Cancel
            </Button>
            <Button onClick={updatePitchDeck}>Update Pitch Deck</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDeckId} onOpenChange={() => cancelDeletePitchDeck()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pitch Deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pitch deck? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => cancelDeletePitchDeck()}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePitchDeck}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { PitchDeckManager };
export default PitchDeckManager;
