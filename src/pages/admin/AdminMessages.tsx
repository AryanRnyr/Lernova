import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MessageSquare, 
  Reply, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff,
  ArrowLeft,
  Loader2,
  Search,
  Calendar
} from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
}

const AdminMessages = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    if (user && isAdmin()) {
      fetchMessages();
    }
  }, [user, roleLoading]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load messages', variant: 'destructive' });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status: 'read' })
      .eq('id', id);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'read' } : m));
    }
  };

  const openReplyDialog = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    setReplyDialogOpen(true);
    if (message.status === 'unread') {
      markAsRead(message.id);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          to: selectedMessage.email,
          name: selectedMessage.name,
          originalMessage: selectedMessage.message,
          reply: replyText,
        },
      });

      if (emailError) throw emailError;

      // Update message status
      const { error: updateError } = await supabase
        .from('contact_messages')
        .update({
          status: 'replied',
          admin_reply: replyText,
          replied_at: new Date().toISOString(),
          replied_by: user?.id,
        })
        .eq('id', selectedMessage.id);

      if (updateError) throw updateError;

      setMessages(prev => prev.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, status: 'replied', admin_reply: replyText, replied_at: new Date().toISOString() }
          : m
      ));

      toast({ title: 'Reply Sent', description: `Email sent to ${selectedMessage.email}` });
      setReplyDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send reply', 
        variant: 'destructive' 
      });
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async () => {
    if (!messageToDelete) return;

    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', messageToDelete);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageToDelete));
      toast({ title: 'Deleted', description: 'Message deleted successfully' });
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge variant="destructive"><span className="flex items-center"><EyeOff className="h-3 w-3 mr-1" />Unread</span></Badge>;
      case 'read':
        return <Badge variant="secondary"><span className="flex items-center"><Eye className="h-3 w-3 mr-1" />Read</span></Badge>;
      case 'replied':
        return <Badge className="bg-green-100 text-green-800"><span className="flex items-center"><Check className="h-3 w-3 mr-1" />Replied</span></Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase());
    const messageDate = new Date(m.created_at);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    const matchesDate = messageDate >= fromDate && messageDate <= toDate;
    return matchesStatus && matchesSearch && matchesDate;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin()) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin access to view this page.</p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-8 w-8" />
              Contact Messages
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-sm">{unreadCount} new</Badge>
              )}
            </h1>
            <p className="text-muted-foreground">View and respond to contact form submissions</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No messages found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.map((message) => (
                  <TableRow key={message.id} className={message.status === 'unread' ? 'bg-muted/30' : ''}>
                    <TableCell>{getStatusBadge(message.status)}</TableCell>
                    <TableCell className="font-medium">{message.name}</TableCell>
                    <TableCell className="text-muted-foreground">{message.email}</TableCell>
                    <TableCell className="max-w-xs truncate">{message.message}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openReplyDialog(message)}
                        >
                          <Reply className="h-4 w-4 mr-1" />
                          {message.status === 'replied' ? 'View' : 'Reply'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setMessageToDelete(message.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Message from {selectedMessage?.name}</DialogTitle>
              <DialogDescription>{selectedMessage?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Original Message:</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedMessage?.message}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Received: {selectedMessage && new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>

              {selectedMessage?.admin_reply ? (
                <div>
                  <Label className="text-sm font-medium text-green-600">Your Reply:</Label>
                  <div className="mt-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="whitespace-pre-wrap">{selectedMessage.admin_reply}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Replied: {selectedMessage.replied_at && new Date(selectedMessage.replied_at).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reply">Your Reply:</Label>
                  <Textarea
                    id="reply"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={6}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                Close
              </Button>
              {!selectedMessage?.admin_reply && (
                <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Reply className="h-4 w-4 mr-2" />}
                  Send Reply
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The message will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteMessage} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default AdminMessages;