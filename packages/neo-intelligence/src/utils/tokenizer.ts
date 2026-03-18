import { getEncoding, encodingForModel, type TiktokenModel } from "js-tiktoken";

/**
 * Utilitário para contagem de tokens compatível com OpenAI
 */
export class Tokenizer {
  private static defaultEncoding = getEncoding("cl100k_base");

  /**
   * Conta tokens em uma string simples
   */
  static countTokens(text: string): number {
    if (!text) return 0;
    return this.defaultEncoding.encode(text).length;
  }

  /**
   * Conta tokens para um modelo específico da OpenAI
   */
  static countForModel(text: string, model: TiktokenModel = "gpt-4"): number {
    try {
      const enc = encodingForModel(model);
      return enc.encode(text).length;
    } catch (e) {
      // Fallback para encoding padrão se o modelo não for reconhecido
      return this.countTokens(text);
    }
  }

  /**
   * Trunca um texto para caber em um limite de tokens
   */
  static truncate(text: string, maxTokens: number): string {
    const tokens = this.defaultEncoding.encode(text);
    if (tokens.length <= maxTokens) return text;

    return this.defaultEncoding.decode(tokens.slice(0, maxTokens));
  }
}
