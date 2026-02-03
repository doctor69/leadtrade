import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import ACHTransferForm from './ACHTransferForm';
import WireTransferForm from './WireTransferForm';

interface BankTransferModalProps {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferComplete?: () => void;
}

export default function BankTransferModal({
  accountId,
  open,
  onOpenChange,
  onTransferComplete
}: BankTransferModalProps) {
  const [activeTab, setActiveTab] = useState<'ach' | 'wire'>('ach');

  const handleTransferComplete = () => {
    onTransferComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bank Transfer</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ach' | 'wire')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ach">ACH (Deposit/Withdraw)</TabsTrigger>
            <TabsTrigger value="wire">Wire (Withdraw Only)</TabsTrigger>
          </TabsList>

          <TabsContent value="ach" className="mt-4">
            <ACHTransferForm 
              accountId={accountId} 
              onTransferComplete={handleTransferComplete}
            />
          </TabsContent>

          <TabsContent value="wire" className="mt-4">
            <WireTransferForm 
              accountId={accountId} 
              onTransferComplete={handleTransferComplete}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
