'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const frameworks = [
  { id: 'nextjs', name: 'Next.js', description: 'Full-stack React framework' },
  { id: 'react', name: 'React + Vite', description: 'Modern React with Vite' },
  { id: 'express', name: 'Express.js', description: 'Node.js web framework' },
  { id: 'python', name: 'Python', description: 'Python scripts and tools' },
  { id: 'other', name: 'Other', description: 'Let AI decide' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [framework, setFramework] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          framework: framework === 'other' ? null : framework,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create project');
      }

      router.push(`/projects/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Create New Project</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Start building your app with AI
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Project Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Project Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome App"
                required
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Description{' '}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what you want to build..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Framework Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Framework{' '}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() =>
                      setFramework(framework === fw.id ? null : fw.id)
                    }
                    disabled={isLoading}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      framework === fw.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="font-medium text-white text-sm">
                      {fw.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {fw.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <Link href="/projects">
                <Button variant="outline" type="button" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
