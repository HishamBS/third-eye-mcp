'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TableSchema {
  name: string;
  type: string;
  primary?: boolean;
  autoIncrement?: boolean;
  hidden?: boolean;
}

interface TableInfo {
  name: string;
  data: Record<string, any>[];
  editable: boolean;
  schema: TableSchema[];
}

interface DatabaseData {
  tables: Record<string, TableInfo>;
}

export default function DatabasePage() {
  const [data, setData] = useState<DatabaseData | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/database/tables`);
      if (response.ok) {
        const result = await response.json();
        const tables = result.data?.tables || result.tables || result;
        setData({ tables });
        if (!selectedTable && Object.keys(tables).length > 0) {
          setSelectedTable(Object.keys(tables)[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch database data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rowKey: string, row: Record<string, any>) => {
    setEditingRow(rowKey);
    setEditValues({ ...row });
  };

  const handleSave = async (tableName: string) => {
    if (!editingRow || !data) return;

    try {
      const table = data.tables[tableName];
      const primaryKey = table.schema.find(s => s.primary);

      if (!primaryKey) return;

      const endpoint = tableName === 'app_settings'
        ? `/api/database/app-settings/${editValues[primaryKey.name]}`
        : `/api/database/eyes-routing/${editValues[primaryKey.name]}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });

      if (response.ok) {
        await fetchData();
        setEditingRow(null);
        setEditValues({});
      }
    } catch (error) {
      console.error('Failed to save row:', error);
    }
  };

  const handleDelete = async (tableName: string, rowKey: string, row: Record<string, any>) => {
    if (!data) return;

    try {
      const table = data.tables[tableName];
      const primaryKey = table.schema.find(s => s.primary);

      if (!primaryKey) return;

      const endpoint = tableName === 'app_settings'
        ? `/api/database/app-settings/${row[primaryKey.name]}`
        : `/api/database/eyes-routing/${row[primaryKey.name]}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete row:', error);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const formatValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return 'null';

    switch (type) {
      case 'timestamp':
        return new Date(value).toLocaleString();
      case 'json':
        return JSON.stringify(value, null, 2);
      case 'boolean':
        return value ? 'true' : 'false';
      default:
        return String(value);
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'app_settings': return '⚙️';
      case 'provider_keys': return '🔑';
      case 'models_cache': return '🤖';
      case 'eyes_routing': return '👁️';
      case 'personas': return '🎭';
      case 'sessions': return '📝';
      case 'runs': return '🏃';
      default: return '📊';
    }
  };

  const getRowKey = (row: Record<string, any>, schema: TableSchema[]): string => {
    const primaryKey = schema.find(s => s.primary);
    return primaryKey ? String(row[primaryKey.name]) : JSON.stringify(row);
  };

  const filteredData = (table: TableInfo) => {
    if (!table?.data) return [];
    if (!filter) return table.data;
    return table.data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };

  const paginatedData = (table: TableInfo) => {
    const filtered = filteredData(table);
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  };

  const totalPages = (table: TableInfo) => {
    return Math.ceil(filteredData(table).length / rowsPerPage);
  };

  // Reset page when filter or table changes
  useEffect(() => {
    setPage(1);
  }, [filter, selectedTable]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br brand-ink flex items-center justify-center">
        <div className="text-white text-xl">Loading database...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br brand-ink flex items-center justify-center">
        <div className="text-white text-xl">Failed to load database</div>
      </div>
    );
  }

  const currentTable = data.tables[selectedTable];

  return (
    <div className="min-h-screen bg-gradient-to-br brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors">
                ← Back to Home
              </Link>
              <h1 className="text-2xl font-bold text-white">Database Browser</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/personas" className="text-slate-400 hover:text-white transition-colors">
                Personas
              </Link>
              <Link href="/models" className="text-slate-400 hover:text-white transition-colors">
                Models
              </Link>
              <Link href="/settings" className="text-slate-400 hover:text-white transition-colors">
                Settings
              </Link>
              <button
                onClick={fetchData}
                className="bg-brand-accent hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-white mb-6">Tables</h2>
            <div className="space-y-2">
              {Object.entries(data.tables).map(([tableName, table]) => (
                <button
                  key={tableName}
                  onClick={() => setSelectedTable(tableName)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTable === tableName
                      ? 'bg-brand-accent text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getTableIcon(tableName)}</span>
                    <div>
                      <div className="font-medium">{table.name}</div>
                      <div className="text-sm opacity-80">
                        {table.data?.length || 0} rows
                        {!table.editable && ' (read-only)'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Table Content */}
          <div className="lg:col-span-3">
            {currentTable ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {currentTable.name}
                    </h2>
                    <div className="flex items-center space-x-4">
                      {!currentTable.editable && (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                          Read Only
                        </span>
                      )}
                      <span className="text-slate-400 text-sm">
                        {filteredData(currentTable).length} of {currentTable.data.length} rows
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Filter rows..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                      <option value={500}>500 rows</option>
                    </select>
                  </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        {currentTable.schema
                          .filter(col => !col.hidden)
                          .map(col => (
                            <th key={col.name} className="px-4 py-3 text-left text-white font-medium">
                              {col.name}
                              {col.primary && <span className="ml-1 text-yellow-400">*</span>}
                            </th>
                          ))}
                        {currentTable.editable && (
                          <th className="px-4 py-3 text-right text-white font-medium">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData(currentTable).map((row) => {
                        const rowKey = getRowKey(row, currentTable.schema);
                        const isEditing = editingRow === rowKey;

                        return (
                          <tr key={rowKey} className="border-t border-slate-700">
                            {currentTable.schema
                              .filter(col => !col.hidden)
                              .map(col => (
                                <td key={col.name} className="px-4 py-3 text-slate-300">
                                  {isEditing ? (
                                    col.type === 'json' ? (
                                      <textarea
                                        value={JSON.stringify(editValues[col.name] || null, null, 2)}
                                        onChange={(e) => {
                                          try {
                                            const parsed = JSON.parse(e.target.value);
                                            setEditValues(prev => ({ ...prev, [col.name]: parsed }));
                                          } catch {
                                            // Invalid JSON, keep as string for now
                                          }
                                        }}
                                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm resize-none"
                                        rows={3}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={editValues[col.name] || ''}
                                        onChange={(e) => setEditValues(prev => ({ ...prev, [col.name]: e.target.value }))}
                                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                                      />
                                    )
                                  ) : (
                                    <div className={col.type === 'json' ? 'font-mono text-xs' : ''}>
                                      {formatValue(row[col.name], col.type)}
                                    </div>
                                  )}
                                </td>
                              ))}
                            {currentTable.editable && (
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleSave(selectedTable)}
                                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleCancel}
                                      className="bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => handleEdit(rowKey, row)}
                                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(selectedTable, rowKey, row)}
                                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredData(currentTable).length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    {filter ? 'No rows match the filter' : 'No data available'}
                  </div>
                )}

                {/* Pagination Controls */}
                {filteredData(currentTable).length > rowsPerPage && (
                  <div className="flex items-center justify-between border-t border-slate-700 p-4">
                    <div className="text-sm text-slate-400">
                      Showing {Math.min((page - 1) * rowsPerPage + 1, filteredData(currentTable).length)} to{' '}
                      {Math.min(page * rowsPerPage, filteredData(currentTable).length)} of{' '}
                      {filteredData(currentTable).length} rows
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages(currentTable) }, (_, i) => i + 1)
                          .filter(p => {
                            // Show first page, last page, current page, and pages around current
                            return (
                              p === 1 ||
                              p === totalPages(currentTable) ||
                              (p >= page - 2 && p <= page + 2)
                            );
                          })
                          .map((p, idx, arr) => (
                            <div key={p} className="flex items-center">
                              {idx > 0 && arr[idx - 1] !== p - 1 && (
                                <span className="px-2 text-slate-400">...</span>
                              )}
                              <button
                                onClick={() => setPage(p)}
                                className={`px-3 py-1 rounded ${
                                  page === p
                                    ? 'bg-brand-accent text-white'
                                    : 'bg-slate-700 text-white hover:bg-slate-600'
                                }`}
                              >
                                {p}
                              </button>
                            </div>
                          ))}
                      </div>
                      <button
                        onClick={() => setPage(Math.min(totalPages(currentTable), page + 1))}
                        disabled={page === totalPages(currentTable)}
                        className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Database Browser</h2>
                <p className="text-slate-400 text-lg">
                  Select a table from the left to view its contents
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}