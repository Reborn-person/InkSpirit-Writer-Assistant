
export const PROVIDER_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'Pro/deepseek-ai/DeepSeek-V3.2',
        'deepseek-ai/DeepSeek-R1',
        'Pro/zai-org/GLM-4.7',
        'zai-org/GLM-4.6',
        'zai-org/GLM-4.6V',
        'Pro/MiniMaxAI/MiniMax-M2.1',
        'Qwen/Qwen3-Next-80B-A3B-Thinking',
     

       
    ],
    'vectorengine': [
        'gemini-3-pro-preview',
        'deepseek-v3.2-thinking',
        'gpt-5.1',
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
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
    'iflow': [
        'qwen3-max-preview',
        'qwen3-max',
        'qwen3-coder-plus',
        'qwen3-vl-plus',
        'kimi-k2-0905',
        'qwen3-235b-a22b-thinking-2507',
        'qwen3-235b-a22b-instruct',
        'glm-4.6',
        'iflow-rome-30ba3b',
        'deepseek-v3.2',
        'deepseek-r1',
        'deepseek-ai/DeepSeek-V3',
        'deepseek-ai/DeepSeek-R1',
        'gpt-4o',
        'gpt-4o-mini'
    ],
    'custom': []
};

export const VECTOR_MODELS: Record<string, string[]> = {
    'siliconflow': [
        'Qwen/Qwen3-Embedding-8B',
        'Qwen/Qwen3-Embedding-4B'
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
    'iflow': [
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
    'iflow': [
        'black-forest-labs/FLUX.1-dev',
        'black-forest-labs/FLUX.1-schnell'
    ],
    'custom': []
};

export const PROVIDER_NAMES: Record<string, string> = {
    'siliconflow': '硅基流动 (SiliconFlow)',
    'vectorengine': '向量引擎 (VectorEngine)',
    'alibaba': '阿里大模型 (Alibaba)',
    'openai': 'OpenAI',
    'iflow': '心流 API (iFlow)',
    'custom': '自定义 (Custom)'
};
