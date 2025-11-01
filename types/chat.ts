import { RecipeCandidate } from './menu';

/**
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'streaming';
  content: string;
  timestamp: Date;
  sseSessionId?: string;
  result?: unknown;
  requiresConfirmation?: boolean;
  requiresSelection?: boolean;
  candidates?: RecipeCandidate[];
  taskId?: string;
  // Phase 3D: 段階情報
  currentStage?: 'main' | 'sub' | 'soup';
  usedIngredients?: string[];
  menuCategory?: 'japanese' | 'western' | 'chinese';
  selectedRecipe?: {
    main?: RecipeCandidate;
    sub?: RecipeCandidate;
    soup?: RecipeCandidate;
  };
}

