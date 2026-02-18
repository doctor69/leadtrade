/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 * 
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertCircle, Loader2, Save, User, Lock, Info } from 'lucide-react';
import { apiService } from '@/lib/apiService';

interface EditProfilePanelProps {
  accountId: string;
}

interface AccountData {
  id: string;
  status: string;
  contact: {
    email_address: string;
    phone_number: string;
    street_address: string[];
    city: string;
    state: string;
    postal_code: string;
  };
  identity: {
    given_name: string;
    family_name: string;
    date_of_birth: string;
    tax_id: string;
    country_of_citizenship: string;
  };
  trusted_contact?: {
    given_name: string;
    family_name: string;
    email_address: string;
  };
}

export default function EditProfilePanel({ accountId }: EditProfilePanelProps) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isKYCApproved, setIsKYCApproved] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [trustedContactName, setTrustedContactName] = useState('');
  const [trustedContactEmail, setTrustedContactEmail] = useState('');

  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getAccount();

      if (result.success && result.data) {
        const data = result.data as AccountData;
        setAccount(data);
        
        // Check if KYC is approved
        setIsKYCApproved(data.status === 'ACTIVE' || data.status === 'APPROVED');

        // Populate form
        setEmail(data.contact?.email_address || '');
        setPhone(data.contact?.phone_number || '');
        setStreet1(data.contact?.street_address?.[0] || '');
        setStreet2(data.contact?.street_address?.[1] || '');
        setCity(data.contact?.city || '');
        setState(data.contact?.state || '');
        setPostalCode(data.contact?.postal_code || '');
        setTrustedContactName(data.trusted_contact?.given_name || '');
        setTrustedContactEmail(data.trusted_contact?.email_address || '');
      } else {
        setError(result.error || 'Failed to load account data');
      }
    } catch (err) {
      console.error('Error loading account:', err);
      setError(err instanceof Error ? err.message : 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updates = {
        contact: {
          email_address: email,
          phone_number: phone,
          street_address: [street1, street2].filter(Boolean),
          city,
          state,
          postal_code: postalCode,
        },
        trusted_contact: trustedContactName && trustedContactEmail ? {
          given_name: trustedContactName,
          email_address: trustedContactEmail,
        } : undefined,
      };

      // Call Edge Function to update account
      const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-account-update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      setSuccess(true);
      await loadAccountData(); // Reload to show updated data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating account:', err);
      setError(err instanceof Error ? err.message : 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error || 'Account not found'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Profile Information
        </CardTitle>
        <CardDescription>
          Update your contact information and trusted contact details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KYC Status Warning */}
        {isKYCApproved && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>KYC Verified Account:</strong> You can update contact information, but sensitive fields like name, date of birth, and SSN cannot be changed. Contact support if you need to update these fields.
              </div>
            </div>
          </div>
        )}

        {/* Read-Only Identity Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Identity Information (Read-Only)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground">Full Name</Label>
              <div className="text-sm font-medium">
                {account.identity?.given_name} {account.identity?.family_name}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Date of Birth</Label>
              <div className="text-sm font-medium">{account.identity?.date_of_birth}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Tax ID (SSN)</Label>
              <div className="text-sm font-medium">***-**-{account.identity?.tax_id?.slice(-4)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">Citizenship</Label>
              <div className="text-sm font-medium">{account.identity?.country_of_citizenship}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            These fields cannot be changed online. Contact support@leadtrade.app if you need to update this information.
          </p>
        </div>

        {/* Editable Contact Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Changing your email will require confirmation via email link
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street1">Street Address</Label>
            <Input
              id="street1"
              value={street1}
              onChange={(e) => setStreet1(e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street2">Apartment, Suite, etc. (Optional)</Label>
            <Input
              id="street2"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NY"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">ZIP Code</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10001"
              />
            </div>
          </div>
        </div>

        {/* Trusted Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Trusted Contact (Optional)</h3>
          <p className="text-xs text-muted-foreground">
            A trusted contact is someone we can reach out to if we're unable to contact you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trustedName">Trusted Contact Name</Label>
              <Input
                id="trustedName"
                value={trustedContactName}
                onChange={(e) => setTrustedContactName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trustedEmail">Trusted Contact Email</Label>
              <Input
                id="trustedEmail"
                type="email"
                value={trustedContactEmail}
                onChange={(e) => setTrustedContactEmail(e.target.value)}
                placeholder="trusted@email.com"
              />
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-lg">
            <Save className="h-4 w-4" />
            <span className="text-sm">Profile updated successfully!</span>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
