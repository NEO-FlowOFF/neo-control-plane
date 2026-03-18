import { OpenAI } from "openai";
import { Tokenizer } from "../utils/tokenizer.js";

interface CaptionOptions {
  productName: string;
  productDescription?: string;
  maxTokens?: number;
}

export class ContentIntelligence {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Gera uma legenda vendedora para TikTok baseada no produto
   */
  async generateCaption(options: CaptionOptions): Promise<string> {
    const { productName, productDescription, maxTokens = 150 } = options;

    const prompt = `Gere uma legenda vendedora para um post de TikTok.
Produto: ${productName}
Descrição: ${productDescription || "N/A"}
Regras:
- Use ganchos (hooks) no início.
- Inclua hashtags relevantes.
- Mantenha um tom persuasivo e divertido.
- Máximo de tokens: ${maxTokens}`;

    // Garante que o prompt não estoure o limite da OpenAI (seja qual for o motivo)
    const truncatedPrompt = Tokenizer.truncate(prompt, 2000);

    const completion = await this.openai.chat.completions.create({
      messages: [{ role: "user", content: truncatedPrompt }],
      model: "gpt-3.5-turbo",
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message.content || "";
  }
}
