// API 配置验证工具
export class APIConfigValidator {
  /**
   * 验证 API 密钥格式
   */
  static validateApiKey(apiKey: string): { valid: boolean; message: string } {
    if (!apiKey || apiKey.trim() === '') {
      return { valid: false, message: 'API 密钥不能为空' };
    }
    
    if (apiKey.length < 10) {
      return { valid: false, message: 'API 密钥长度太短，请检查是否正确' };
    }
    
    // 检查常见的 API 密钥格式
    if (apiKey.startsWith('sk-') || apiKey.includes('-') || apiKey.length >= 20) {
      return { valid: true, message: 'API 密钥格式正确' };
    }
    
    return { valid: true, message: 'API 密钥已设置' };
  }
  
  /**
   * 验证 Base URL 格式
   */
  static validateBaseUrl(url: string): { valid: boolean; message: string } {
    if (!url || url.trim() === '') {
      return { valid: false, message: 'Base URL 不能为空' };
    }
    
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, message: 'URL 协议必须是 http 或 https' };
      }
      return { valid: true, message: 'URL 格式正确' };
    } catch {
      return { valid: false, message: 'URL 格式不正确' };
    }
  }
  
  /**
   * 验证模型名称
   */
  static validateModel(model: string): { valid: boolean; message: string } {
    if (!model || model.trim() === '') {
      return { valid: false, message: '模型名称不能为空' };
    }
    
    const commonModels = [
      'gpt-4', 'gpt-4o', 'gpt-3.5-turbo',
      'deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-14B-Instruct',
      'THUDM/glm-4-9b-chat', 'meta-llama/Llama-2-7b-chat-hf'
    ];
    
    if (commonModels.includes(model)) {
      return { valid: true, message: '模型名称有效' };
    }
    
    // 检查模型名称格式
    if (model.includes('/') || model.includes('-') || model.length >= 3) {
      return { valid: true, message: '模型名称格式正确' };
    }
    
    return { valid: false, message: '模型名称格式不正确' };
  }
  
  /**
   * 完整的 API 配置验证
   */
  static validateConfig(apiKey: string, baseUrl: string, model: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证 API 密钥
    const keyValidation = this.validateApiKey(apiKey);
    if (!keyValidation.valid) {
      errors.push(keyValidation.message);
    }
    
    // 验证 Base URL
    const urlValidation = this.validateBaseUrl(baseUrl);
    if (!urlValidation.valid) {
      errors.push(urlValidation.message);
    }
    
    // 验证模型
    const modelValidation = this.validateModel(model);
    if (!modelValidation.valid) {
      errors.push(modelValidation.message);
    }
    
    // 警告检查
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      warnings.push('您正在使用本地服务地址，请确保本地服务正在运行');
    }
    
    if (model.includes('test') || model.includes('demo')) {
      warnings.push('您正在使用测试模型，可能无法获得最佳效果');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 获取 API 服务提供商信息
   */
  static getProviderInfo(baseUrl: string): {
    provider: string;
    docsUrl: string;
    helpText: string;
  } {
    if (baseUrl.includes('openai.com')) {
      return {
        provider: 'OpenAI',
        docsUrl: 'https://platform.openai.com/docs',
        helpText: '请确保您的 OpenAI API 密钥有效且账户有余额'
      };
    } else if (baseUrl.includes('siliconflow.cn')) {
      return {
        provider: 'SiliconFlow',
        docsUrl: 'https://docs.siliconflow.cn',
        helpText: '请确保您的 SiliconFlow API 密钥有效'
      };
    } else if (baseUrl.includes('deepseek.com')) {
      return {
        provider: 'DeepSeek',
        docsUrl: 'https://platform.deepseek.com/docs',
        helpText: '请确保您的 DeepSeek API 密钥有效'
      };
    } else {
      return {
        provider: '自定义服务',
        docsUrl: '',
        helpText: '请确保您的 API 服务配置正确'
      };
    }
  }
}