'use client';

import { useState, useEffect } from 'react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { Download, Upload, Trash2, RefreshCw, Database, Save, FileText } from 'lucide-react';

export default function StorageManagerPage() {
  const [storageStats, setStorageStats] = useState({ used: 0, total: 0, percentage: 0 });
  const [modulesData, setModulesData] = useState<Record<string, any>>({});
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [hasBackup, setHasBackup] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 加载储存状态
  const loadStorageStatus = () => {
    setStorageStats(StorageManager.getStorageStats());
    setModulesData(StorageManager.getAllModulesData());
    setLastSaveTime(StorageManager.getLastSaveTime());
    setHasBackup(!!StorageManager.get(STORAGE_KEYS.PROJECT_BACKUP));
  };

  useEffect(() => {
    loadStorageStatus();
  }, []);

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 导出项目
  const handleExport = () => {
    const projectData = StorageManager.exportProject();
    if (projectData) {
      const blob = new Blob([projectData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novel_project_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('success', '项目导出成功！');
    } else {
      showMessage('error', '导出失败：没有可导出的数据');
    }
  };

  // 导出为TXT文件夹 (ZIP)
  const handleExportTxtZip = async () => {
    try {
      const blob = await StorageManager.exportToTxtZip();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `novel_txt_export_${new Date().getTime()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('success', 'TXT文件夹导出成功！');
      } else {
        showMessage('error', '导出失败：没有可导出的数据');
      }
    } catch (err) {
      console.error(err);
      showMessage('error', '导出失败：处理过程中出错');
    }
  };

  // 导入项目
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (StorageManager.importProject(content)) {
          loadStorageStatus();
          showMessage('success', '项目导入成功！');
        } else {
          showMessage('error', '导入失败：文件格式错误');
        }
      } catch {
        showMessage('error', '导入失败：无法读取文件');
      }
    };
    reader.readAsText(file);
  };

  // 创建备份
  const handleCreateBackup = () => {
    StorageManager.createBackup();
    setHasBackup(true);
    showMessage('success', '备份创建成功！');
  };

  // 恢复备份
  const handleRestoreBackup = () => {
    if (confirm('确定要恢复备份吗？当前数据将被覆盖。')) {
      if (StorageManager.restoreBackup()) {
        loadStorageStatus();
        showMessage('success', '备份恢复成功！');
      } else {
        showMessage('error', '恢复失败：没有找到备份');
      }
    }
  };

  // 清空数据
  const handleClearAll = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      StorageManager.clearAll();
      loadStorageStatus();
      showMessage('success', '所有数据已清空！');
    }
  };

  // 清空单个模块
  const handleClearModule = (moduleId: string) => {
    if (confirm(`确定要清空模块 ${moduleId} 的数据吗？`)) {
      StorageManager.remove(STORAGE_KEYS.MODULE_INPUT(moduleId));
      StorageManager.remove(STORAGE_KEYS.MODULE_OUTPUT(moduleId));
      loadStorageStatus();
      showMessage('success', `模块 ${moduleId} 已清空！`);
    }
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (time: string | null) => {
    if (!time) return '从未保存';
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* 头部 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Database className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">储存管理</h1>
              </div>
              {message && (
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>

          {/* 储存统计 */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">储存使用情况</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatBytes(storageStats.used)}</div>
                <div className="text-sm text-blue-800">已使用空间</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{formatBytes(storageStats.total)}</div>
                <div className="text-sm text-gray-800">总可用空间</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{storageStats.percentage.toFixed(1)}%</div>
                <div className="text-sm text-green-800">使用率</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              最后保存时间: {formatTime(lastSaveTime)}
            </div>
          </div>

          {/* 数据管理 */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">数据管理</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出项目</span>
              </button>

              <button
                onClick={handleExportTxtZip}
                className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>导出TXT文件夹</span>
              </button>
              
              <label className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>导入项目</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={handleCreateBackup}
                className="flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>创建备份</span>
              </button>
              
              {hasBackup && (
                <button
                  onClick={handleRestoreBackup}
                  className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>恢复备份</span>
                </button>
              )}
            </div>
          </div>

          {/* 模块数据 */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">模块数据</h2>
              <button
                onClick={handleClearAll}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>清空所有</span>
              </button>
            </div>
            
            {Object.keys(modulesData).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>暂无模块数据</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(modulesData).map(([moduleId, data]) => (
                  <div key={moduleId} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">模块 {moduleId}</h3>
                      <button
                        onClick={() => handleClearModule(moduleId)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {data.input && <div>✓ 有输入数据</div>}
                      {data.output && <div>✓ 有输出数据</div>}
                      {!data.input && !data.output && <div>无有效数据</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}