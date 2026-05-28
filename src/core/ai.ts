import { loadSettings } from '@storage/settings';
import { withRetry } from './retry';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class AICopilotClient {
  /**
   * Generates a single-turn completion
   */
  async generateCompletion(prompt: string, systemPrompt = "You are a helpful academic AI research assistant.", jsonMode = false): Promise<string> {
    return this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], jsonMode);
  }

  /**
   * Multi-turn chat completion with full conversation history
   * Retries up to 3 times on transient network/rate-limit errors.
   */
  async generateChatCompletion(messages: ChatMessage[], jsonMode = false): Promise<string> {
    const settings = await loadSettings();
    const config = settings.ai || {
      provider: 'openai',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o'
    };

    if (!config.apiKey) {
      throw new Error('LLM API key is missing. Please configure it in Settings.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };

    const requestBody: Record<string, any> = {
      model: config.model || 'gpt-4o',
      messages,
      temperature: 0.2
    };

    if (jsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    return withRetry(async () => {
      let response: Response;
      try {
        response = await fetch(`${config.endpoint}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });
      } catch (e: unknown) {
        const reason = e instanceof Error ? e.message : String(e);
        throw new Error(`AI API request failed: ${reason}`);
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message = err.error?.message || `AI API returned status ${response.status}`;
        throw new Error(message);
      }

      const result = await response.json();
      return result.choices?.[0]?.message?.content || '';
    });
  }

  /**
   * Summarizes academic papers
   */
  async summarizePaper(title: string, abstract: string, fullText = ''): Promise<string> {
    const systemPrompt = "You are a professional academic peer reviewer and domain expert. Summarize the provided academic paper context concisely.";
    const prompt = `
      Paper Title: ${title}
      Abstract: ${abstract}
      ${fullText ? `Selected Context: ${fullText}` : ''}

      Please generate:
      1. A one-sentence high-level breakthrough summary.
      2. 3 core key contributions (bullet points).
      3. 2 potential weaknesses or aspects to look out for.

      Format your response beautifully in standard Markdown. Keep it concise.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Generates Draft Response for Reviewer Comments
   */
  async generateReviewResponse(comment: string, recordMethodology = '', manuscriptAbstract = ''): Promise<string> {
    const systemPrompt = "You are an expert academic author crafting a rebuttal letter. Maintain a polite, professional, and confident tone. Format in markdown.";
    const prompt = `
      Reviewer Comment:
      "${comment}"

      Context from our Research Records:
      "${recordMethodology}"

      Manuscript Abstract Context:
      "${manuscriptAbstract}"

      Generate a professional, structured draft response for a rebuttal matrix.
      Include:
      1. A polite acknowledgment of the reviewer's point.
      2. A clear, scientifically-sound answer explaining what we did/revised.
      3. A clear description of the specific changes made in the manuscript draft.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Analyze research gaps from existing literature records
   */
  async analyzeResearchGap(records: Array<{ title: string; summary: string; tags: string[] }>): Promise<string> {
    const systemPrompt = "You are a research strategy advisor. Analyze the provided literature to identify research gaps and opportunities.";
    const litSummary = records.map((r, i) => `${i + 1}. "${r.title}" - ${r.summary} [${r.tags.join(', ')}]`).join('\n');
    const prompt = `
      Literature portfolio:
      ${litSummary}

      Based on this body of work, identify:
      1. 3-5 specific research gaps or unexplored questions
      2. Potential methodologies to address each gap
      3. Expected impact and novelty of each direction
      4. Suggested reading or cross-references to pursue

      Format in structured Markdown with clear sections.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Generate hypothesis suggestions for a research topic
   */
  async generateHypothesis(topic: string, context: string): Promise<string> {
    const systemPrompt = "You are a research methodology expert helping formulate testable hypotheses.";
    const prompt = `
      Research Topic: ${topic}
      Background Context: ${context}

      Generate 3-5 well-formed research hypotheses that:
      1. Are specific, measurable, and testable
      2. Build on existing literature
      3. Cover different aspects of the topic
      4. Include suggested experimental approaches for each

      Format as structured Markdown.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Improve academic writing for a specific section
   */
  async improveWriting(text: string, section: string): Promise<string> {
    const systemPrompt = "You are an expert academic writing coach specializing in scientific publications. Provide improvements while maintaining the author's voice and technical accuracy.";
    const prompt = `
      Section type: ${section}
      Original text:
      "${text}"

      Please provide:
      1. An improved version of the text with better clarity, flow, and academic tone
      2. A brief list of specific changes made and why
      3. Any suggestions for additional content or restructuring

      Keep the technical content accurate. Format in Markdown.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Suggest citations for a given context
   */
  async suggestCitations(context: string, existingRecords: Array<{ title: string; externalRef: string | null }>): Promise<string> {
    const systemPrompt = "You are a reference librarian helping researchers find relevant citations.";
    const existing = existingRecords.map(r => `- ${r.title}${r.externalRef ? ` (DOI: ${r.externalRef})` : ''}`).join('\n');
    const prompt = `
      Writing context:
      "${context}"

      Already cited/referenced:
      ${existing || 'None yet'}

      Suggest 5-10 highly relevant papers that should be cited in this context. For each:
      1. Full citation in APA format
      2. Brief relevance note (why it should be cited)
      3. Where in the text it should be placed

      Focus on seminal works, recent high-impact papers, and methodological references.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }

  /**
   * Generate experiment design for a hypothesis
   */
  async generateExperimentDesign(hypothesis: string): Promise<string> {
    const systemPrompt = "You are an experimental design consultant for academic research.";
    const prompt = `
      Hypothesis to test:
      "${hypothesis}"

      Design a comprehensive experiment plan including:
      1. Experimental objectives and success criteria
      2. Variables (independent, dependent, controlled)
      3. Sample size considerations
      4. Methodology and procedures (step-by-step)
      5. Data collection and analysis plan
      6. Potential confounds and mitigation strategies
      7. Timeline estimate

      Format as structured Markdown with clear sections.
    `;
    return await this.generateCompletion(prompt, systemPrompt);
  }
}

export const aiCopilot = new AICopilotClient();
export default aiCopilot;
