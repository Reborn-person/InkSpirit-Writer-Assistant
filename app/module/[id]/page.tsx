'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PROMPTS } from '@/lib/prompts';
import { generateContent } from '@/lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Copy, Save, Wand2, Trash2, Download } from 'lucide-react';
import { StorageManager, STORAGE_KEYS } from '@/lib/storage';

import Module7Editor from '@/components/Module7Editor';

export default function ModulePage() {
  const params = useParams();
  const id = params.id as keyof typeof PROMPTS;
  const moduleConfig = PROMPTS[id];

  if (id === 'module7') {
      return <Module7Editor />;
  }

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load saved data on mount
  useEffect(() => {
    const savedData = StorageManager.getJSON(STORAGE_KEYS.MODULE_INPUT(id));
    if (savedData) {
      setFormData(savedData);
    }
    
    const savedResult = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT(id));
    if (savedResult) {
      setResult(savedResult);
    }
    // ... auto-fill logic ...
    // Auto-fill from previous modules
    if (id === 'module2') {
        const mod1 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module1'));
        if (mod1) setFormData(prev => ({ ...prev, module1Output: mod1 }));
    } else if (id === 'module2_5') {
        const mod2 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2'));
        if (mod2) setFormData(prev => ({ ...prev, module2Output: mod2 }));
        
        // Try to auto-parse plot table, foreshadowing, and pacing from Module 2 if possible
        if (mod2) {
            const plotTableMatch = mod2.match(/情节分布表[\s\S]*?(?=###|$)/);
            const foreshadowMatch = mod2.match(/伏笔清单[\s\S]*?(?=###|$)/);
            const pacingMatch = mod2.match(/节奏表[\s\S]*?(?=###|$)/);

            if (plotTableMatch) setFormData(prev => ({ ...prev, plotTable: plotTableMatch[0] }));
            if (foreshadowMatch) setFormData(prev => ({ ...prev, foreshadowingList: foreshadowMatch[0] }));
            if (pacingMatch) setFormData(prev => ({ ...prev, pacingTable: pacingMatch[0] }));
        }
    } else if (id === 'module3') {
        const mod2 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2'));
        const mod25 = StorageManager.get(STORAGE_KEYS.MODULE_OUTPUT('module2_5'));
        if (mod2) setFormData(prev => ({ ...prev, module2Output: mod2 }));
        if (mod25) setFormData(prev => ({ ...prev, module2_5Output: mod25 }));
    }
  }, [id]);

  if (!moduleConfig) {
    return <div>未找到该模块</div>;
  }

  const handleInputChange = (key: string, value: any) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    StorageManager.setJSON(STORAGE_KEYS.MODULE_INPUT(id), newData);
  };

  const handleReset = () => {
    if (confirm('确定要清空当前模块的输入和输出缓存吗？此操作不可撤销。')) {
        setFormData({});
        setResult('');
        StorageManager.remove(STORAGE_KEYS.MODULE_INPUT(id));
        StorageManager.remove(STORAGE_KEYS.MODULE_OUTPUT(id));
    }
  };

  const handleSaveProject = () => {
      const projectData = {
          input: formData,
          output: result,
          timestamp: new Date().toISOString(),
          moduleId: id
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novel_project_${id}_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    if (!result) return;
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${moduleConfig.title} - 输出结果</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
h1 { color: #1a1a1a; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; }
pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
code { font-family: monospace; }
blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 15px; color: #666; }
</style>
</head>
<body>
<h1>${moduleConfig.title} - 输出结果</h1>
<div class="content">
${result.replace(/\n/g, '<br/>')} 
</div>
</body>
</html>`;
    // Note: A real markdown-to-html converter would be better, but simple replace works for basic text
    // Since we have react-markdown in the app, we can't easily use it here for static string generation without SSR tools.
    // For now, we will download the raw text wrapped in HTML or use a simple blob.
    // Actually, let's just save the raw text as .html for simplicity or use a basic markdown parser if available.
    // For this demo, I'll wrap the markdown in a pre/code block or just simple formatting.
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novel_output_${id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const isPlanningModule = ['module1', 'module2', 'module2_5'].includes(id);
      
      let apiKey = '';
      let baseUrl = '';
      let model = '';

      if (isPlanningModule) {
          apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
          model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1';
      } else {
          apiKey = StorageManager.get(STORAGE_KEYS.WRITING_API_KEY) || StorageManager.get('novel_writer_api_key') || '';
          baseUrl = StorageManager.get(STORAGE_KEYS.WRITING_BASE_URL) || StorageManager.get('novel_writer_base_url') || 'https://api.siliconflow.cn/v1';
          model = StorageManager.get(STORAGE_KEYS.WRITING_MODEL) || 'deepseek-ai/DeepSeek-R1';
      }

      const userPrompt = moduleConfig.userTemplate(formData);
      // Remove deepseek-V3 default
      if (model === 'deepseek-ai/DeepSeek-V3') {
         model = 'deepseek-ai/DeepSeek-R1'; 
      }
      const generatedText = await generateContent(apiKey, moduleConfig.system, userPrompt, baseUrl, model);
      
      setResult(generatedText);
      StorageManager.set(STORAGE_KEYS.MODULE_OUTPUT(id), generatedText);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderInputs = () => {
    switch (id) {
      case 'module1':
        return (
          <>
            <TextArea label="写出你的脑洞" value={formData.brainhole} onChange={(v) => handleInputChange('brainhole', v)} rows={6} placeholder="请详细描述你的脑洞想法..." />
            <Input label="核心元素" value={formData.elements} onChange={(v) => handleInputChange('elements', v)} placeholder="例如：医术、空间神器" />
            <Select label="目标受众" value={formData.audience} onChange={(v) => handleInputChange('audience', v)} options={['男频', '女频', '全年龄']} />
            <Select 
              label="风格基调" 
              value={formData.style} 
              onChange={(v) => handleInputChange('style', Array.isArray(v) ? v.join('、') : v)} 
              multiple={true}
              options={[
                // 玄幻奇幻
                '东方仙侠', '西方奇幻', '传统玄幻', '玄幻脑洞', '洪荒封神', '高武世界',
                // 都市现实
                '都市脑洞', '都市修真', '都市日常', '战神赘婿', '神豪', '鉴宝', '职场', '娱乐明星', '乡村种田', '年代文',
                // 科幻末世
                '科幻末世', '赛博朋克', '废土', '黑科技', '星际文明',
                // 悬疑灵异
                '悬疑灵异', '惊悚游戏', '盗墓探险', '推理破案', '克苏鲁',
                // 历史军事
                '历史穿越', '历史脑洞', '抗战谍战', '大秦', '大唐', '三国',
                // 游戏竞技
                '游戏体育', '网游电竞', 
                // 衍生同人
                '动漫衍生', '同人小说', '诸天万界', '聊天群',
                // 女频特色
                '古代言情', '现代言情', '宫斗宅斗', '豪门总裁', '快穿系统', '纯爱',
                // 特殊流派
                '无限流', '无敌流', '迪化流', '系统流', '直播流', '无CP', '暗黑', '治愈', '搞笑'
              ]} 
            />
            <Input label="限制条件" value={formData.constraints} onChange={(v) => handleInputChange('constraints', v)} placeholder="例如：无后宫、单女主" />
            <Input label="超长篇要求" value={formData.longReq} onChange={(v) => handleInputChange('longReq', v)} placeholder="例如：10个大阶段、必含番外" />
          </>
        );
      case 'module2':
        return (
          <>
            <TextArea label="模块1输出（脑洞方案）" value={formData.module1Output} onChange={(v) => handleInputChange('module1Output', v)} rows={5} />
            <Select label="开篇类型" value={formData.openingType} onChange={(v) => handleInputChange('openingType', v)} options={['万能冲突', '悬念做局', '人设做局', '日常乱做局']} />
            <Select label="情节密度" value={formData.density} onChange={(v) => handleInputChange('density', v)} options={['中密度（默认）', '高密度', '低密度']} />
            <Input label="必含情节" value={formData.requiredPlots} onChange={(v) => handleInputChange('requiredPlots', v)} placeholder="希望包含的具体情节" />
          </>
        );
      case 'module2_5':
        return (
          <>
            <TextArea label="模块2输出（大纲）" value={formData.module2Output} onChange={(v) => handleInputChange('module2Output', v)} rows={5} />
            <TextArea label="情节分布表" value={formData.plotTable} onChange={(v) => handleInputChange('plotTable', v)} rows={3} placeholder="在此粘贴情节分布表" />
            <TextArea label="伏笔清单" value={formData.foreshadowingList} onChange={(v) => handleInputChange('foreshadowingList', v)} rows={3} placeholder="在此粘贴伏笔清单" />
            <TextArea label="节奏表" value={formData.pacingTable} onChange={(v) => handleInputChange('pacingTable', v)} rows={3} placeholder="在此粘贴节奏表" />
            <Input label="章节范围" value={formData.chapterRange} onChange={(v) => handleInputChange('chapterRange', v)} placeholder="1-50" />
          </>
        );
       case 'module3':
        return (
          <>
            <TextArea label="模块2输出（大纲）" value={formData.module2Output} onChange={(v) => handleInputChange('module2Output', v)} rows={4} />
            <TextArea label="模块2.5输出（前3章细纲）" value={formData.module2_5Output} onChange={(v) => handleInputChange('module2_5Output', v)} rows={4} />
            <Select label="开篇类型" value={formData.openingType} onChange={(v) => handleInputChange('openingType', v)} options={['万能冲突', '悬念做局', '人设做局', '日常乱做局']} />
            <Select label="分镜头风格" value={formData.shotStyle} onChange={(v) => handleInputChange('shotStyle', v)} options={['电影级', '简洁级']} />
            <TextArea label="核心设定" value={formData.coreSettings} onChange={(v) => handleInputChange('coreSettings', v)} rows={3} placeholder="记忆点、人物设定" />
          </>
        );
        case 'module4':
        return (
          <>
             <TextArea label="上一章内容" value={formData.previousContent} onChange={(v) => handleInputChange('previousContent', v)} rows={4} placeholder="已生成的最后一章内容" />
             <TextArea label="详细细纲" value={formData.module2_5Output} onChange={(v) => handleInputChange('module2_5Output', v)} rows={4} />
             <Input label="章节范围" value={formData.chapterRange} onChange={(v) => handleInputChange('chapterRange', v)} placeholder="4-10" />
             <Input label="字数要求" value={formData.wordCount} onChange={(v) => handleInputChange('wordCount', v)} placeholder="3000" />
          </>
        );
      case 'module5':
        return (
          <>
             <TextArea label="模块1输出（脑洞方案）" value={formData.module1Output} onChange={(v) => handleInputChange('module1Output', v)} rows={4} />
             <Input label="原著信息" value={formData.originalInfo} onChange={(v) => handleInputChange('originalInfo', v)} placeholder="名称+风格（例如：诡秘之主 - 克苏鲁蒸汽朋克）" />
             <TextArea label="参考片段" value={formData.referenceFragment} onChange={(v) => handleInputChange('referenceFragment', v)} rows={4} placeholder="粘贴你想模仿的风格片段" />
             <Select label="仿写类型" value={formData.imitationType} onChange={(v) => handleInputChange('imitationType', v)} options={['大纲', '细纲', '开篇', '后续章节']} />
             <Input label="范围/字数" value={formData.rangeOrWordCount} onChange={(v) => handleInputChange('rangeOrWordCount', v)} placeholder="例如：第1-3章 或 3000字" />
             <TextArea label="结构参考" value={formData.structureRef} onChange={(v) => handleInputChange('structureRef', v)} rows={3} placeholder="例如：斗罗大陆的10个阶段" />
          </>
        );
      case 'module6':
        return (
          <>
             <TextArea label="初稿内容" value={formData.draft} onChange={(v) => handleInputChange('draft', v)} rows={8} placeholder="粘贴需要润色的文本" />
             <TextArea label="核心设定" value={formData.coreSettings} onChange={(v) => handleInputChange('coreSettings', v)} rows={3} />
             <TextArea label="修改后的大纲" value={formData.modifiedOutline} onChange={(v) => handleInputChange('modifiedOutline', v)} rows={3} />
             <Select label="润色风格" value={formData.polishStyle} onChange={(v) => handleInputChange('polishStyle', v)} options={['口语化', '文艺', '快节奏']} />
             <Input label="需修正的问题" value={formData.issuesToFix} onChange={(v) => handleInputChange('issuesToFix', v)} placeholder="例如：逻辑漏洞、语法、节奏" />
          </>
        );
      default:
        return <div className="text-gray-500 italic">该模块的表单尚未实现。</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{moduleConfig.title}</h1>
        <p className="text-gray-600 mt-2">{moduleConfig.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              输入
            </h2>
            <div className="space-y-4">
              {renderInputs()}
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
              {loading ? '生成中...' : '生成内容'}
            </button>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-1 h-6 bg-green-500 rounded-full"></span>
                输出
              </h2>
              <div className="flex gap-2">
                 <button 
                  onClick={handleReset}
                  className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                  title="清空重置"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                 <button 
                  onClick={handleExportHtml}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  title="导出HTML"
                >
                  <Download className="w-4 h-4" />
                </button>
                 <button 
                  onClick={handleSaveProject}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  title="保存项目 (JSON)"
                >
                  <Save className="w-4 h-4" />
                </button>
                 <button 
                  onClick={() => { navigator.clipboard.writeText(result) }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                  title="复制到剪贴板"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-100 overflow-y-auto max-h-[800px] prose prose-sm max-w-none">
              {result ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              ) : (
                <div className="text-gray-400 text-center mt-20">
                  生成的内容将显示在这里...
                </div>
              )}
            </div>
            <textarea 
                className="mt-4 w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={result}
                onChange={(e) => {
                    setResult(e.target.value);
                    StorageManager.set(STORAGE_KEYS.MODULE_OUTPUT(id), e.target.value);
                }}
                placeholder="你可以在这里直接编辑结果..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// UI Components
function Input({ label, value, onChange, placeholder }: { label: string, value?: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }: { label: string, value?: string, onChange: (v: string) => void, rows?: number, placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, multiple = false }: { label: string, value?: string | string[], onChange: (v: string | string[]) => void, options: string[], multiple?: boolean }) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selectedOptions);
    } else {
      onChange(e.target.value);
    }
  };

  // Checkbox handling for multiple selection
  const handleCheckboxChange = (optionValue: string) => {
    let currentValues: string[] = [];
    if (typeof value === 'string') {
        currentValues = value ? value.split('、') : [];
    } else if (Array.isArray(value)) {
        currentValues = [...value];
    }

    if (currentValues.includes(optionValue)) {
      onChange(currentValues.filter(v => v !== optionValue));
    } else {
      onChange([...currentValues, optionValue]);
    }
  };

  const isSelected = (optionValue: string) => {
    if (multiple) {
        if (Array.isArray(value)) return value.includes(optionValue);
        if (typeof value === 'string') return value.split('、').includes(optionValue);
        return false;
    }
    return value === optionValue;
  };

  if (multiple) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-300 rounded-lg bg-white">
          {options.map(opt => (
            <label key={opt} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected(opt)}
                onChange={() => handleCheckboxChange(opt)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">已选: {Array.isArray(value) ? value.join('、') : (typeof value === 'string' ? value : '')}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value as string || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
