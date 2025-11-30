import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, CheckCircle } from 'lucide-react';
import { createTransfer, type CreateTransferRequest } from '../../lib/alpaca-transfers';
import { listBankRelationships, type BankRelationship } from '../../lib/alpaca-bank-relationships';

interface WireTransferFormProps {
  accountId: string;
  onTransferComplete?: () => void;
}

export default function WireTransferForm({ accountId, onTransferComplete }: WireTransferFormProps) {
  const [bankRelationships, setBankRelationships] = useState<BankRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    direction: 'INCOMING' as 'INCOMING' | 'OUTGOING',
    amount: '',
    bank_id: '',
    additional_information: '',
    fee_payment_method: 'user' as 'user' | 'invoice'
  });

  useEffect(() => {
    loadBankRelationships();
  }, [accountId]);

  const loadBankRelationships = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await listBankRelationships(accountId);

      if (result.success && result.banks) {
        setBankRelationships(result.banks);
        
        // Auto-select first bank if available
        if (result.banks.length > 0 && !formData.bank_id) {
          setFormData(prev => ({ ...prev, bank_id: result.banks![0].id }));
        }
      } else {
        setError(result.error || 'Failed to load bank relationships');
      }
    } catch (err) {
      console.error('Error loading bank relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bank relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bank_id) {
      setError('Please select a bank');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!formData.additional_information.trim()) {
      setError('Please provide additional information for the wire transfer');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const transferRequest: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: formData.amount,
        direction: formData.direction,
        bank_id: formData.bank_id,
        additional_information: formData.additional_information,
        fee_payment_method: formData.fee_payment_method
      };

      const result = await createTransfer(accountId, transferRequest);

      if (result.success) {
        setSuccess(true);
        setFormData({
          direction: 'INCOMING',
          amount: '',
          bank_id: formData.bank_id,
          additional_information: '',
          fee_payment_method: 'user'
        });
        
        setTimeout(() => setSuccess(false), 5000);
        onTransferComplete?.();
      } else {
        setError(result.error || 'Failed to create wire transfer');
      }
    } catch (err) {
      console.error('Error creating wire transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wire transfer');
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

  if (bankRelationships.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wire Transfer</CardTitle>
          <CardDescription>Transfer funds via wire</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No bank relationships found. Please add a bank relationship first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wire Transfer</CardTitle>
        <CardDescription>
          Transfer funds via wire transfer (faster but with fees)
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
                <span className="text-sm">Wire transfer initiated successfully</span>
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
            <Label htmlFor="bank_id">Bank</Label>
            <Select
              value={formData.bank_id}
              onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
            >
              <SelectTrigger id="bank_id">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {bankRelationships.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name} - {bank.bank_code_type.toUpperCase()}: {bank.bank_code}
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
            <Label htmlFor="additional_information">Additional Information</Label>
            <Textarea
              id="additional_information"
              value={formData.additional_information}
              onChange={(e) => setFormData({ ...formData, additional_information: e.target.value })}
              placeholder="Purpose of transfer, reference number, etc."
              rows={3}
              required
            />
            <p className="text-sm text-muted-foreground">
              Provide details about the purpose of this wire transfer
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fee_payment_method">Fee Payment Method</Label>
            <Select
              value={formData.fee_payment_method}
              onValueChange={(value: 'user' | 'invoice') => 
                setFormData({ ...formData, fee_payment_method: value })
              }
            >
              <SelectTrigger id="fee_payment_method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Deduct from Transfer Amount</SelectItem>
                <SelectItem value="invoice">Invoice Separately</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How wire transfer fees should be handled
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Wire Transfer Fees:</strong> Wire transfers typically incur fees ranging from $15-$50. 
              Processing time is usually same-day or next business day.
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
                {formData.direction === 'INCOMING' ? 'Initiate Wire Deposit' : 'Initiate Wire Withdrawal'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
