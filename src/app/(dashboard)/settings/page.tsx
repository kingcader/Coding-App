'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import {
  User,
  Key,
  Settings2,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface UserSettings {
  name: string;
  email: string;
  image: string | null;
  preferredProvider: 'CLAUDE' | 'OPENAI';
  claudeApiKey: string | null;
  openaiApiKey: string | null;
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [preferredProvider, setPreferredProvider] = useState<'CLAUDE' | 'OPENAI'>('CLAUDE');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setName(data.name || '');
        setPreferredProvider(data.preferredProvider || 'CLAUDE');
        // API keys are masked, don't set them
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        await updateSession({ name });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredProvider }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferences updated successfully!' });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const updates: Record<string, string> = {};
      if (claudeApiKey) updates.claudeApiKey = claudeApiKey;
      if (openaiApiKey) updates.openaiApiKey = openaiApiKey;

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'API keys updated successfully!' });
        setClaudeApiKey('');
        setOpenaiApiKey('');
        fetchSettings(); // Refresh to get masked keys
      } else {
        throw new Error('Failed to update API keys');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update API keys' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApiKey = async (provider: 'claude' | 'openai') => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [provider === 'claude' ? 'claudeApiKey' : 'openaiApiKey']: null,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'API key removed successfully!' });
        fetchSettings();
      } else {
        throw new Error('Failed to remove API key');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/settings/account', {
        method: 'DELETE',
      });

      if (response.ok) {
        await signOut({ callbackUrl: '/' });
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5 text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          )}
          <p className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-500 hover:text-gray-300"
          >
            &times;
          </button>
        </div>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Profile picture is synced from your OAuth provider</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email</label>
            <Input
              value={settings?.email || ''}
              disabled
              className="bg-gray-800 text-gray-500"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Default AI Provider</label>
            <div className="flex gap-4">
              <button
                onClick={() => setPreferredProvider('CLAUDE')}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  preferredProvider === 'CLAUDE'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Claude</p>
                    <p className="text-sm text-gray-400">By Anthropic</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPreferredProvider('OPENAI')}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  preferredProvider === 'OPENAI'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">GPT-4</p>
                    <p className="text-sm text-gray-400">By OpenAI</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <Button onClick={handleSavePreferences} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-gray-400">
            Optionally add your own API keys for higher rate limits. Your keys are encrypted and stored securely.
          </p>

          {/* Claude API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Claude API Key</label>
            {settings?.claudeApiKey ? (
              <div className="flex items-center gap-2">
                <Input
                  value="sk-ant-••••••••••••••••"
                  disabled
                  className="bg-gray-800 text-gray-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteApiKey('claude')}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showClaudeKey ? 'text' : 'password'}
                    value={claudeApiKey}
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowClaudeKey(!showClaudeKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showClaudeKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">OpenAI API Key</label>
            {settings?.openaiApiKey ? (
              <div className="flex items-center gap-2">
                <Input
                  value="sk-••••••••••••••••"
                  disabled
                  className="bg-gray-800 text-gray-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteApiKey('openai')}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showOpenaiKey ? 'text' : 'password'}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showOpenaiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {(!settings?.claudeApiKey || !settings?.openaiApiKey) && (
            <Button
              onClick={handleSaveApiKeys}
              disabled={isSaving || (!claudeApiKey && !openaiApiKey)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save API Keys'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-400">
            Once you delete your account, there is no going back. All your projects, files, and data will be permanently deleted.
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          ) : (
            <div className="space-y-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-sm text-red-400 font-medium">
                Type DELETE to confirm account deletion
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="border-red-500/50"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account Permanently'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
