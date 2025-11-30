import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, CheckCircle } from 'lucide-react';
import { createTransfer, type CreateTransferRequest } from '../../lib/alpaca-transfers';
import { listACHRelationships, type ACHRelationship } from '../../lib/alpaca-ach-relationships';

interface ACHTransferFormProps {
  accountId: string;
  tradingMode?: 'paper' | 'live';
  onTransferComplete?: () => void;
}

export default function ACHTransferForm({ accountId, tradingMode = 'paper', onTransferComplete }: ACHTransferFormProps) {
  const [achRelationships, setAchRelationships] = useState<ACHRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    direction: 'INCOMING' as 'INCOMING' | 'OUTGOING',
    amount: '',
    relationship_id: '',
    timing: 'immediate' as 'immediate' | 'next_day'
  });

  useEffect(() => {
    loadACHRelationships();
  }, [accountId]);

  const loadACHRelationships = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await listACHRelationships(accountId, { status: 'approved' }, tradingMode);

      if (result.success && result.relationships) {
        setAchRelationships(result.relationships.filter(r => r.status === 'approved'));
        
        // Auto-select first relationship if available
        if (result.relationships.length > 0 && !formData.relationship_id) {
          setFormData(prev => ({ ...prev, relationship_id: result.relationships![0].id }));
        }
      } else {
        setError(result.error || 'Failed to load ACH relationships');
      }
    } catch (err) {
      console.error('Error loading ACH relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ACH relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.relationship_id) {
      setError('Please select an ACH relationship');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const transferRequest: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: formData.amount,
        direction: formData.direction,
        timing: formData.timing,
        relationship_id: formData.relationship_id
      };

      const result = await createTransfer(accountId, transferRequest);

      if (result.success) {
        setSuccess(true);
        setFormData({
          direction: 'INCOMING',
          amount: '',
          relationship_id: formData.relationship_id,
          timing: 'immediate'
        });
        
        setTimeout(() => setSuccess(false), 5000);
        onTransferComplete?.();
      } else {
        setError(result.error || 'Failed to create transfer');
      }
    } catch (err) {
      console.error('Error creating transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achRelationships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ACH Transfer</CardTitle>
          <CardDescription>Transfer funds via ACH</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No approved ACH relationships found. Please add and verify an ACH relationship first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ACH Transfer</CardTitle>
        <CardDescription>
          Transfer funds between your bank account and trading account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Transfer initiated successfully</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="direction">Transfer Direction</Label>
            <Select
              value={formData.direction}
              onValueChange={(value: 'INCOMING' | 'OUTGOING') => 
                setFormData({ ...formData, direction: value })
              }
            >
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOMING">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="h-4 w-4" />
                    Deposit (Bank → Trading Account)
                  </div>
                </SelectItem>
                <SelectItem value="OUTGOING">
                  <div className="flex items-center gap-2">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Withdraw (Trading Account → Bank)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship_id">Bank Account</Label>
            <Select
              value={formData.relationship_id}
              onValueChange={(value) => setFormData({ ...formData, relationship_id: value })}
            >
              <SelectTrigger id="relationship_id">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {achRelationships.map((ach) => (
                  <SelectItem key={ach.id} value={ach.id}>
                    {ach.nickname || ach.account_owner_name} - {ach.bank_account_type} ••••{ach.bank_account_number.slice(-4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timing">Transfer Speed</Label>
            <Select
              value={formData.timing}
              onValueChange={(value: 'immediate' | 'next_day') => 
                setFormData({ ...formData, timing: value })
              }
            >
              <SelectTrigger id="timing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate (Same Day)</SelectItem>
                <SelectItem value="next_day">Next Day</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Immediate transfers may incur additional fees
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> ACH transfers typically take 1-3 business days to complete. 
              Funds will be available in your account once the transfer is approved.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                {formData.direction === 'INCOMING' ? (
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                )}
                {formData.direction === 'INCOMING' ? 'Deposit Funds' : 'Withdraw Funds'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
