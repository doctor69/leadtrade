import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertCircle, Building2, Plus, Trash2 } from 'lucide-react';
import {
    createACHRelationship,
    listACHRelationships,
    deleteACHRelationship,
    type ACHRelationship
} from '../../lib/alpaca-ach-relationships';
import {
    createBankRelationship,
    listBankRelationships,
    deleteBankRelationship,
    type BankRelationship
} from '../../lib/alpaca-bank-relationships';

interface BankLinkingProps {
    accountId: string;
    tradingMode?: 'paper' | 'live';
}

export default function BankLinking({ accountId, tradingMode = 'paper' }: BankLinkingProps) {
    const [achRelationships, setAchRelationships] = useState<ACHRelationship[]>([]);
    const [bankRelationships, setBankRelationships] = useState<BankRelationship[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddACH, setShowAddACH] = useState(false);
    const [showAddBank, setShowAddBank] = useState(false);

    // ACH Form State
    const [achForm, setAchForm] = useState({
        account_owner_name: '',
        bank_account_type: 'checking' as 'checking' | 'savings',
        bank_account_number: '',
        bank_routing_number: '',
        nickname: ''
    });

    // Bank Form State
    const [bankForm, setBankForm] = useState({
        name: '',
        bank_code: '',
        bank_code_type: 'aba' as 'aba' | 'bic',
        account_number: '',
        country: 'USA',
        city: '',
        state: '',
        postal_code: '',
        street_address: ''
    });

    useEffect(() => {
        loadRelationships();
    }, [accountId]);

    const loadRelationships = async () => {
        try {
            setLoading(true);
            setError(null);

            const [achResult, bankResult] = await Promise.all([
                listACHRelationships(accountId, undefined, tradingMode),
                listBankRelationships(accountId)
            ]);

            if (achResult.success && achResult.relationships) {
                setAchRelationships(achResult.relationships);
            }

            if (bankResult.success && bankResult.banks) {
                setBankRelationships(bankResult.banks);
            }

            if (!achResult.success || !bankResult.success) {
                setError(achResult.error || bankResult.error || 'Failed to load relationships');
            }
        } catch (err) {
            console.error('Error loading relationships:', err);
            setError(err instanceof Error ? err.message : 'Failed to load relationships');
        } finally {
            setLoading(false);
        }
    };

    const handleAddACH = async () => {
        try {
            setError(null);
            const result = await createACHRelationship(accountId, achForm, tradingMode);

            if (result.success) {
                setShowAddACH(false);
                setAchForm({
                    account_owner_name: '',
                    bank_account_type: 'checking',
                    bank_account_number: '',
                    bank_routing_number: '',
                    nickname: ''
                });
                await loadRelationships();
            } else {
                setError(result.error || 'Failed to add ACH relationship');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add ACH relationship');
        }
    };

    const handleDeleteACH = async (achId: string) => {
        if (!confirm('Are you sure you want to remove this ACH relationship?')) return;

        try {
            setError(null);
            const result = await deleteACHRelationship(accountId, achId, tradingMode);

            if (result.success) {
                await loadRelationships();
            } else {
                setError(result.error || 'Failed to delete ACH relationship');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete ACH relationship');
        }
    };

    const handleAddBank = async () => {
        try {
            setError(null);

            // Validate bank_code format based on type
            if (bankForm.bank_code_type === 'aba') {
                // ABA routing numbers must be exactly 9 digits
                if (!/^\d{9}$/.test(bankForm.bank_code)) {
                    setError('ABA routing number must be exactly 9 digits');
                    return;
                }
            } else if (bankForm.bank_code_type === 'bic') {
                // BIC/SWIFT codes must be 8 or 11 characters (letters and numbers)
                if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i.test(bankForm.bank_code)) {
                    setError('BIC/SWIFT code must be 8 or 11 characters (e.g., CHASUS33 or CHASUS33XXX)');
                    return;
                }

                // For BIC, additional fields are required
                if (!bankForm.country || !bankForm.state || !bankForm.postal_code || !bankForm.city || !bankForm.street_address) {
                    setError('For international banks (BIC), all address fields are required');
                    return;
                }
            }

            // Prepare bank data based on bank_code_type
            const bankData: any = {
                name: bankForm.name,
                bank_code: bankForm.bank_code,
                bank_code_type: bankForm.bank_code_type,
                account_number: bankForm.account_number
            };

            // Add address fields ONLY for BIC (international banks)
            if (bankForm.bank_code_type === 'bic') {
                if (bankForm.country) bankData.country = bankForm.country;
                if (bankForm.city) bankData.city = bankForm.city;
                if (bankForm.state) bankData.state_province = bankForm.state;
                if (bankForm.postal_code) bankData.postal_code = bankForm.postal_code;
                if (bankForm.street_address) bankData.street_address = bankForm.street_address;
            }

            const result = await createBankRelationship(accountId, bankData);

            if (result.success) {
                setShowAddBank(false);
                setBankForm({
                    name: '',
                    bank_code: '',
                    bank_code_type: 'aba',
                    account_number: '',
                    country: 'USA',
                    city: '',
                    state: '',
                    postal_code: '',
                    street_address: ''
                });
                await loadRelationships();
            } else {
                setError(result.error || 'Failed to add bank relationship');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add bank relationship');
        }
    };

    const handleDeleteBank = async (bankId: string) => {
        if (!confirm('Are you sure you want to remove this bank relationship?')) return;

        try {
            setError(null);
            const result = await deleteBankRelationship(accountId, bankId);

            if (result.success) {
                await loadRelationships();
            } else {
                setError(result.error || 'Failed to delete bank relationship');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete bank relationship');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
                {status}
            </span>
        );
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

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* ACH Relationships */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                ACH Relationships
                            </CardTitle>
                            <CardDescription>
                                Link your bank account for ACH transfers
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowAddACH(!showAddACH)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add ACH
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {showAddACH && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="account_owner_name">Account Owner Name</Label>
                                    <Input
                                        id="account_owner_name"
                                        value={achForm.account_owner_name}
                                        onChange={(e) => setAchForm({ ...achForm, account_owner_name: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="bank_account_type">Account Type</Label>
                                    <Select
                                        value={achForm.bank_account_type}
                                        onValueChange={(value: 'checking' | 'savings') =>
                                            setAchForm({ ...achForm, bank_account_type: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="checking">Checking</SelectItem>
                                            <SelectItem value="savings">Savings</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="bank_routing_number">Routing Number</Label>
                                    <Input
                                        id="bank_routing_number"
                                        value={achForm.bank_routing_number}
                                        onChange={(e) => setAchForm({ ...achForm, bank_routing_number: e.target.value })}
                                        placeholder="123456789"
                                        maxLength={9}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="bank_account_number">Account Number</Label>
                                    <Input
                                        id="bank_account_number"
                                        type="password"
                                        value={achForm.bank_account_number}
                                        onChange={(e) => setAchForm({ ...achForm, bank_account_number: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor="nickname">Nickname (Optional)</Label>
                                    <Input
                                        id="nickname"
                                        value={achForm.nickname}
                                        onChange={(e) => setAchForm({ ...achForm, nickname: e.target.value })}
                                        placeholder="My Checking Account"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAddACH}>Add ACH Relationship</Button>
                                <Button variant="outline" onClick={() => setShowAddACH(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {achRelationships.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No ACH relationships found. Add one to enable transfers.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {achRelationships.map((ach) => (
                                <div key={ach.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{ach.nickname || ach.account_owner_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {ach.bank_account_type} •••• {ach.bank_account_number.slice(-4)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(ach.status)}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteACH(ach.id)}
                                            disabled={ach.status === 'pending'}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bank Relationships (for wire transfers) */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Bank Relationships
                            </CardTitle>
                            <CardDescription>
                                Add recipient banks for wire transfers
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowAddBank(!showAddBank)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Bank
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {showAddBank && (
                        <div className="border rounded-lg p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="bank_name">Bank Name</Label>
                                    <Input
                                        id="bank_name"
                                        value={bankForm.name}
                                        onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                                        placeholder="Chase Bank"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="bank_code_type">Code Type</Label>
                                    <Select
                                        value={bankForm.bank_code_type}
                                        onValueChange={(value: 'aba' | 'bic') =>
                                            setBankForm({ ...bankForm, bank_code_type: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aba">ABA (US)</SelectItem>
                                            <SelectItem value="bic">BIC/SWIFT (International)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="bank_code">
                                        Bank Code
                                        <span className="text-xs text-muted-foreground ml-2">
                                            {bankForm.bank_code_type === 'aba' ? '(9 digits)' : '(8 or 11 characters)'}
                                        </span>
                                    </Label>
                                    <Input
                                        id="bank_code"
                                        value={bankForm.bank_code}
                                        onChange={(e) => setBankForm({ ...bankForm, bank_code: e.target.value })}
                                        placeholder={bankForm.bank_code_type === 'aba' ? '123456789' : 'CHASUS33'}
                                        maxLength={bankForm.bank_code_type === 'aba' ? 9 : 11}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {bankForm.bank_code_type === 'aba'
                                            ? 'Enter the 9-digit ABA routing number'
                                            : 'Enter the 8 or 11 character BIC/SWIFT code'}
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="account_number">Account Number</Label>
                                    <Input
                                        id="account_number"
                                        value={bankForm.account_number}
                                        onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                                        placeholder="Account number"
                                    />
                                </div>
                            </div>

                            {/* Address fields - required for BIC, optional for ABA */}
                            {bankForm.bank_code_type === 'bic' && (
                                <div className="border-t pt-4 mt-4">
                                    <p className="text-sm font-medium mb-3">Bank Address (Required for International)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="country">Country</Label>
                                            <Input
                                                id="country"
                                                value={bankForm.country}
                                                onChange={(e) => setBankForm({ ...bankForm, country: e.target.value })}
                                                placeholder="USA"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="state">State/Province</Label>
                                            <Input
                                                id="state"
                                                value={bankForm.state}
                                                onChange={(e) => setBankForm({ ...bankForm, state: e.target.value })}
                                                placeholder="California"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="city">City</Label>
                                            <Input
                                                id="city"
                                                value={bankForm.city}
                                                onChange={(e) => setBankForm({ ...bankForm, city: e.target.value })}
                                                placeholder="San Francisco"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="postal_code">Postal Code</Label>
                                            <Input
                                                id="postal_code"
                                                value={bankForm.postal_code}
                                                onChange={(e) => setBankForm({ ...bankForm, postal_code: e.target.value })}
                                                placeholder="94102"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Label htmlFor="street_address">Street Address</Label>
                                            <Input
                                                id="street_address"
                                                value={bankForm.street_address}
                                                onChange={(e) => setBankForm({ ...bankForm, street_address: e.target.value })}
                                                placeholder="123 Main Street"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button onClick={handleAddBank}>Add Bank Relationship</Button>
                                <Button variant="outline" onClick={() => setShowAddBank(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {bankRelationships.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No bank relationships found. Add one to enable wire transfers.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {bankRelationships.map((bank) => (
                                <div key={bank.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{bank.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {bank.bank_code_type.toUpperCase()}: {bank.bank_code}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(bank.status)}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteBank(bank.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
