
export const PROVIDER_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'moonshotai/Kimi-K2-Thinking',
        'zai-org/GLM-4.6',
        'MiniMaxAI/MiniMax-M2',
        'zai-org/GLM-4.6V'
    ],
    'vectorengine': [
        'grok-4.1',
        'gpt-5.2',
        'doubao-seed-1-8-251228',
        'gemini-3-pro-preview-11-2025',
        'qwen-plus',
        'claude-opus-4-5-20251101'
    ],
    'alibaba': [
        'qwen-turbo',
        'qwen-plus',
        'qwen-max',
        'qwen-long'
    ],
    'openai': [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
    ],
    'custom': []
};

export const VECTOR_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'text-embedding-3-large',
        'text-embedding-3-small'
    ],
    'vectorengine': [
        'text-embedding-3-large',
        'text-embedding-3-small'
    ],
    'alibaba': [
        'text-embedding-3-large',
        'text-embedding-3-small'
    ],
    'openai': [
        'text-embedding-3-large',
        'text-embedding-3-small'
    ],
    'custom': []
};

export const IMAGE_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'deepseek-ai/Janus-Pro-7B', // DeepSeek's new multimodal model
        'Qwen/Qwen-Image', // Text-to-Image
        'black-forest-labs/FLUX.1-dev',
        'black-forest-labs/FLUX.1-schnell',
        'stabilityai/stable-diffusion-3-medium',
        'stabilityai/stable-diffusion-xl-base-1.0',
        'Qwen/Qwen-Image-Edit' // Image Editing (requires input image)
    ],
    'vectorengine': [
        'grok-4-image' // Added based on user input
    ],
    'alibaba': [
        'wanx-v1',
        'wanx-background-generation-v2'
    ],
    'openai': [
        'dall-e-3',
        'dall-e-2'
    ],
    'custom': []
};

export const PROVIDER_NAMES: Record<string, string> = {
    'siliconflow': '硅基流动 (SiliconFlow)',
    'vectorengine': '向量引擎 (VectorEngine)',
    'alibaba': '阿里大模型 (Alibaba)',
    'openai': 'OpenAI',
    'custom': '自定义 (Custom)'
};
