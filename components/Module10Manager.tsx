'use client';

import { useState, useEffect } from 'react';
import { PROMPTS } from '@/lib/prompts';
import { StorageManager } from '@/lib/storage';
import { FileJson, Plus, Trash2, Edit2, Download, Upload, CheckCircle2, Search, Copy } from 'lucide-react';

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  lastModified?: number;
}

const MODULES = [
  { id: 'module0_5', name: '0.5 拆书模块' },
  { id: 'module1', name: '1. 脑洞具象化' },
  { id: 'module2', name: '2. 大纲生成' },
  { id: 'module2_5', name: '2.5 细纲生成' },
  { id: 'module3', name: '3. 开篇生成' },
  { id: 'module4', name: '4. 章节批量' },
  { id: 'module5', name: '5. 仿写创作' },
  { id: 'module6', name: '6. 全文润色' },
  { id: 'module7', name: '7. AI 辅助写作' },
];

export default function Module10Manager() {
  const [selectedModuleId, setSelectedModuleId] = useState('module0_5');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Load templates when module changes
  useEffect(() => {
    loadTemplates(selectedModuleId);
  }, [selectedModuleId]);

  const loadTemplates = (moduleId: string) => {
    const savedTemplates = StorageManager.getJSON(`prompt_templates_${moduleId}`);
    if (savedTemplates && Array.isArray(savedTemplates)) {
      setPromptTemplates(savedTemplates);
    } else {
      // Initialize with default system prompt from PROMPTS
      const defaultSystem = PROMPTS[moduleId as keyof typeof PROMPTS]?.system || '';
      const initialTemplates = [{
        id: 'default',
        title: '默认模板',
        content: defaultSystem,
        isDefault: true,
        lastModified: Date.now()
      }];
      setPromptTemplates(initialTemplates);
      // Optional: Save it immediately so it exists? No, better not pollute storage unless user edits.
      // But for consistency in UI, we treat it as existing.
    }
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    let newTemplates = [...promptTemplates];
    const index = newTemplates.findIndex(t => t.id === editingTemplate.id);

    if (index >= 0) {
      newTemplates[index] = { ...editingTemplate, lastModified: Date.now() };
    } else {
      newTemplates.push({ ...editingTemplate, lastModified: Date.now() });
    }

    setPromptTemplates(newTemplates);
    StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('确定要删除这个模板吗？')) {
      const newTemplates = promptTemplates.filter(t => t.id !== templateId);
      setPromptTemplates(newTemplates);
      StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, newTemplates);
    }
  };

  const handleAddNewTemplate = () => {
    setEditingTemplate({
      id: Date.now().toString(),
      title: '新模板',
      content: '',
      lastModified: Date.now()
    });
    setViewMode('edit');
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleExportTemplates = () => {
    const data = {
      moduleId: selectedModuleId,
      moduleName: MODULES.find(m => m.id === selectedModuleId)?.name,
      templates: promptTemplates,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts_${selectedModuleId}_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          let newTemplatesToAdd: PromptTemplate[] = [];

          if (importedData.templates && Array.isArray(importedData.templates)) {
            newTemplatesToAdd = importedData.templates;
          } else if (importedData.systemPrompt) {
             newTemplatesToAdd = [{
                 id: Date.now().toString(),
                 title: '导入的模板',
                 content: importedData.systemPrompt,
                 lastModified: Date.now()
             }];
          }

          if (newTemplatesToAdd.length > 0) {
            // Merge logic: append new ones. 
            // Optional: Check for duplicates? For now just append.
            // Assign new IDs to avoid conflict if importing from same export? 
            // Or keep IDs to allow overwrite? Let's generate new IDs for safety unless we want sync.
            // Simple append:
            const updatedTemplates = [...promptTemplates, ...newTemplatesToAdd.map(t => ({...t, id: Date.now().toString() + Math.random()}))];
            setPromptTemplates(updatedTemplates);
            StorageManager.setJSON(`prompt_templates_${selectedModuleId}`, updatedTemplates);
            alert(`成功导入 ${newTemplatesToAdd.length} 个模板`);
          }
        } catch (error) {
          alert('文件格式错误');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Reset input
  };

  const filteredTemplates = promptTemplates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      {/* Sidebar: Module List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-blue-600" />
            模块选择
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {MODULES.map(module => (
            <button
              key={module.id}
              onClick={() => setSelectedModuleId(module.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedModuleId === module.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {module.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Template List/Edit */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {MODULES.find(m => m.id === selectedModuleId)?.name} - 提示词库
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              共 {promptTemplates.length} 个模板
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <>
                <div className="relative">
                   <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                      type="text" 
                      placeholder="搜索模板..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                   />
                </div>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <div className="relative">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImportTemplates}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="导入JSON配置"
                    />
                    <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" />
                        导入
                    </button>
                </div>
                <button 
                    onClick={handleExportTemplates}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                    <Download className="w-4 h-4" />
                    导出
                </button>
                <button 
                    onClick={handleAddNewTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新建模板
                </button>
              </>
            )}
            {viewMode === 'edit' && (
              <button 
                  onClick={() => {
                    setViewMode('list');
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                  返回列表
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 text-lg">{template.title}</h3>
                        {template.isDefault && (
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">系统默认</span>
                        )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(template.content);
                                alert('已复制到剪贴板');
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="复制内容"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        {!template.isDefault && (
                             <button 
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded-lg h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap border border-gray-100">
                        {template.content}
                    </div>
                    <button 
                        onClick={() => handleEditTemplate(template)}
                        className="absolute bottom-2 right-2 p-1.5 bg-white shadow border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="编辑全文"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                    <span>ID: {template.id.slice(-6)}</span>
                    <span>{new Date(template.lastModified || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              
              {filteredTemplates.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>未找到匹配的模板</p>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">模板标题</label>
                        <input 
                            type="text" 
                            value={editingTemplate?.title || ''}
                            onChange={e => setEditingTemplate(prev => prev ? ({...prev, title: e.target.value}) : null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="输入模板标题..."
                        />
                    </div>
                </div>
                <div className="flex-1 p-6 flex flex-col">
                     <label className="block text-sm font-medium text-gray-700 mb-2">提示词内容 (System Prompt)</label>
                     <textarea
                        value={editingTemplate?.content || ''}
                        onChange={e => setEditingTemplate(prev => prev ? ({...prev, content: e.target.value}) : null)}
                        className="flex-1 w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-relaxed resize-none"
                        placeholder="在此编写详细的提示词..."
                    />
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button 
                        onClick={() => setViewMode('list')}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSaveTemplate}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        保存更改
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
