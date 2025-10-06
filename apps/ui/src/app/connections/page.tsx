'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface McpIntegration {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  status: string;
  platforms: string[];
  configType: string;
  configFiles: Array<{ platform: string; path: string }>;
  configTemplate: string;
  setupSteps: Array<{ title: string; description: string; code: string | null }>;
  docsUrl: string | null;
  enabled: boolean;
  displayOrder: number;
}

interface IntegrationConfigResponse {
  config: string;
  configType: string;
  configFiles: Array<{ platform: string; path: string }>;
  paths: {
    HOME: string;
    MCP_PATH: string;
    MCP_BIN: string;
    PLATFORM: string;
    USER: string;
  };
}

export default function ConnectionsPage() {
  const [integrations, setIntegrations] = useState<McpIntegration[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, IntegrationConfigResponse>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/integrations?enabled=true`);
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async (integrationId: string) => {
    if (configs[integrationId]) return; // Already fetched

    try {
      const response = await fetch(`${API_URL}/api/integrations/${integrationId}/config`);
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfigs((prev) => ({ ...prev, [integrationId]: data }));
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    if (newExpandedId) {
      fetchConfig(newExpandedId);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      macos: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    };
    return labels[platform] || platform;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">MCP Connection Guides</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">MCP Connection Guides</h1>
          <div className="border border-red-500 bg-red-50 rounded-lg p-6">
            <p className="text-red-700">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-2">MCP Connection Guides</h1>
          <p className="text-gray-600 mb-8">
            Connect Third Eye MCP to your favorite AI tools. Click an integration to view setup instructions.
          </p>
        </motion.div>

        <div className="space-y-4">
          {integrations.map((integration, index) => {
            const isExpanded = expandedId === integration.id;
            const config = configs[integration.id];

            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <button
                  onClick={() => toggleExpanded(integration.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {integration.logoUrl ? (
                      <img
                        src={integration.logoUrl}
                        alt={integration.name}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-blue-600 text-white flex items-center justify-center font-bold">
                        {integration.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{integration.name}</h3>
                      <p className="text-sm text-gray-600">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {integration.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {getPlatformLabel(platform)}
                        </span>
                      ))}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t bg-gray-50"
                  >
                    <div className="px-6 py-4 space-y-6">
                      {/* Configuration File Path */}
                      <div>
                        <h4 className="font-semibold mb-2">Configuration File</h4>
                        {integration.configFiles.map((file) => (
                          <div key={file.platform} className="text-sm">
                            <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                              {file.path}
                            </span>
                            <span className="text-gray-500 ml-2">({getPlatformLabel(file.platform)})</span>
                          </div>
                        ))}
                      </div>

                      {/* Configuration Snippet */}
                      {config && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Configuration</h4>
                            <button
                              onClick={() => copyToClipboard(config.config, integration.id)}
                              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              {copiedId === integration.id ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy Config
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                            {config.config}
                          </pre>
                        </div>
                      )}

                      {/* Setup Steps */}
                      {integration.setupSteps.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3">Setup Instructions</h4>
                          <ol className="space-y-3">
                            {integration.setupSteps.map((step, idx) => (
                              <li key={idx} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{step.title}</p>
                                  <p className="text-sm text-gray-600">{step.description}</p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Documentation Link */}
                      {integration.docsUrl && (
                        <div>
                          <a
                            href={integration.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Official Documentation
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {integrations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No integrations available. Please check your server configuration.
          </div>
        )}
      </div>
    </div>
  );
}
