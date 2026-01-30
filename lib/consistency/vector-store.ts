import { StorageManager, STORAGE_KEYS } from '@/lib/storage';
import { generateEmbeddings, cosineSimilarity } from '@/lib/ai';

export interface VectorDocument {
    id: string;
    text: string;
    type: 'character' | 'world' | 'chapter_fragment' | 'fact';
    metadata?: any;
    embedding?: number[];
}

export class ConsistencyVectorStore {
    private index: VectorDocument[] = [];
    private isLoaded = false;
    private readonly STORAGE_KEY = 'novel_writer_consistency_vector_index';

    async load() {
        if (this.isLoaded) return;
        const saved = await StorageManager.getJSONAsync(this.STORAGE_KEY);
        if (Array.isArray(saved)) {
            this.index = saved;
        }
        this.isLoaded = true;
    }

    async save() {
        await StorageManager.setJSON(this.STORAGE_KEY, this.index);
    }

    async clear() {
        this.index = [];
        await this.save();
    }

    /**
     * Add documents to the store.
     * Note: This generates embeddings which costs API tokens.
     */
    async addDocuments(docs: VectorDocument[]) {
        if (docs.length === 0) return;

        // Filter out docs that already exist (by ID) to save tokens
        const newDocs = docs.filter(doc => !this.index.some(existing => existing.id === doc.id));
        if (newDocs.length === 0) return;

        // Get API Config
        const apiKey = StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key');
        const baseUrl = StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url');
        let model = StorageManager.get(STORAGE_KEYS.RAG_MODEL) || 'deepseek-ai/DeepSeek-R1'; 
        // Note: DeepSeek-R1 is a chat model, we need an embedding model.
        // Usually embedding model is separate. Let's try to get specific embedding config or fallback.
        // If the user hasn't set a specific embedding model, we default to 'text-embedding-3-large' or 'BAAI/bge-m3'
        // But generateEmbeddings defaults to 'text-embedding-3-large'.
        
        // Let's check if there is a specific VECTOR config, otherwise use default
        const vectorModel = StorageManager.get(STORAGE_KEYS.VECTOR_MODEL) || 'BAAI/bge-m3';
        const vectorBaseUrl = StorageManager.get(STORAGE_KEYS.VECTOR_BASE_URL) || baseUrl; // Fallback to main base url
        const vectorApiKey = StorageManager.get(STORAGE_KEYS.VECTOR_API_KEY) || apiKey;

        if (!vectorApiKey) {
            console.warn('ConsistencyVectorStore: No API Key found for embeddings.');
            return;
        }

        try {
            const texts = newDocs.map(d => d.text);
            const embeddings = await generateEmbeddings(vectorApiKey, texts, vectorBaseUrl, vectorModel);

            newDocs.forEach((doc, idx) => {
                doc.embedding = embeddings[idx];
                this.index.push(doc);
            });

            await this.save();
        } catch (e) {
            console.error('ConsistencyVectorStore: Failed to generate embeddings', e);
        }
    }

    async search(query: string, limit = 5, typeFilter?: string[]): Promise<VectorDocument[]> {
        if (!query.trim()) return [];
        
        // Ensure loaded
        if (!this.isLoaded) await this.load();
        if (this.index.length === 0) return [];

        // Generate query embedding
        const apiKey = StorageManager.get(STORAGE_KEYS.VECTOR_API_KEY) || StorageManager.get(STORAGE_KEYS.RAG_API_KEY) || StorageManager.get('novel_writer_api_key');
        const baseUrl = StorageManager.get(STORAGE_KEYS.VECTOR_BASE_URL) || StorageManager.get(STORAGE_KEYS.RAG_BASE_URL) || StorageManager.get('novel_writer_base_url');
        const vectorModel = StorageManager.get(STORAGE_KEYS.VECTOR_MODEL) || 'BAAI/bge-m3';

        if (!apiKey) return [];

        try {
            const [queryEmbedding] = await generateEmbeddings(apiKey, [query], baseUrl, vectorModel);

            // Calculate similarity
            const scored = this.index
                .filter(doc => !typeFilter || typeFilter.includes(doc.type))
                .map(doc => ({
                    ...doc,
                    score: doc.embedding ? cosineSimilarity(queryEmbedding, doc.embedding) : 0
                }));

            // Sort and limit
            return scored
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

        } catch (e) {
            console.error('ConsistencyVectorStore: Search failed', e);
            return [];
        }
    }
}

export const consistencyVectorStore = new ConsistencyVectorStore();
