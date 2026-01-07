import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Code2,
  MessageSquare,
  Download,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">AI App Builder</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signin">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Zap className="h-4 w-4" />
            Powered by Claude & GPT-4
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Build Apps with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Natural Language
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Describe your app in plain English. Get real, working code. Iterate
            through conversation, preview results, and export your projects.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signin">
              <Button size="lg" className="gap-2">
                Start Building Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Code Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent pointer-events-none z-10" />
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-gray-400">AI App Builder</span>
              </div>
              <div className="p-6 text-left">
                <div className="flex gap-4 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">Y</span>
                  </div>
                  <div className="flex-1 bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-300">
                      Create a todo app with React. It should have the ability to add,
                      complete, and delete tasks. Use local storage to persist data.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-300 mb-3">
                      I&apos;ll create a React todo app for you. Here are the files:
                    </p>
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm">
                      <div className="text-green-400">+ src/App.tsx</div>
                      <div className="text-green-400">+ src/components/TodoList.tsx</div>
                      <div className="text-green-400">+ src/hooks/useTodos.ts</div>
                      <div className="text-gray-500">...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 border-t border-gray-800">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Everything You Need to Build
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            From idea to working code in minutes. Our AI understands what you want
            and generates production-ready applications.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Conversational Interface"
              description="Describe your app naturally. Ask for changes, add features, fix bugs - all through conversation."
            />
            <FeatureCard
              icon={<Code2 className="h-6 w-6" />}
              title="Real Working Code"
              description="Get production-ready code, not snippets. Complete project structure with all dependencies."
            />
            <FeatureCard
              icon={<Download className="h-6 w-6" />}
              title="Export Anywhere"
              description="Download your project as a ZIP. Deploy to Vercel, Netlify, or your own servers."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Multiple AI Models"
              description="Choose between Claude and GPT-4. Use the best model for your specific needs."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Secure & Private"
              description="Your projects are isolated and private. We never store sensitive credentials."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Version History"
              description="Track every change. Roll back to any previous version with one click."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Start free, upgrade when you need more.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Free"
              price="$0"
              description="Perfect for trying out"
              features={[
                '5 generations per month',
                '1 project',
                'Basic support',
                'Export to ZIP',
              ]}
            />
            <PricingCard
              name="Pro"
              price="$29"
              description="For serious builders"
              features={[
                '100 generations per month',
                'Unlimited projects',
                'Priority support',
                'Version history',
                'All AI models',
              ]}
              highlighted
            />
            <PricingCard
              name="Enterprise"
              price="$99"
              description="For teams & businesses"
              features={[
                'Unlimited generations',
                'Unlimited projects',
                'Priority support',
                'Team features',
                'Custom models',
                'API access',
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-gray-800">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-gray-400 mb-8">
            Join thousands of developers building apps with AI. Start free today.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" className="gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white">AI App Builder</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/help" className="hover:text-white">
              Help
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-colors">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-6 rounded-xl border ${
        highlighted
          ? 'border-blue-500 bg-blue-500/5'
          : 'border-gray-800 bg-gray-900/50'
      }`}
    >
      {highlighted && (
        <div className="text-xs font-medium text-blue-400 mb-2">MOST POPULAR</div>
      )}
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <div className="mt-2 mb-1">
        <span className="text-4xl font-bold text-white">{price}</span>
        {price !== '$0' && <span className="text-gray-400">/month</span>}
      </div>
      <p className="text-sm text-gray-400 mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <svg
              className="h-4 w-4 text-green-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link href="/auth/signin">
        <Button
          variant={highlighted ? 'default' : 'outline'}
          className="w-full"
        >
          {name === 'Free' ? 'Get Started' : 'Subscribe'}
        </Button>
      </Link>
    </div>
  );
}
