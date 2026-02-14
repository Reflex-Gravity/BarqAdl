const { invokeModel } = require('../config/bedrock');
const { loadPrompt } = require('../utils/promptLoader');
const { safeJsonParse } = require('../utils/helpers');

const JUDGE_PROMPT = loadPrompt('judge-evaluator');

const evaluate = async (userQuery, classification, agentResponse, trace) => {
  const span = trace.span({ name: 'judge-evaluate' });

  const userContent = `## Original User Query
${userQuery}

## Classification
${JSON.stringify(classification, null, 2)}

## Sub-Agent Response
${agentResponse}

Evaluate this response.`;

  try {
    const raw = await invokeModel(JUDGE_PROMPT, userContent, {
      temperature: 0.2,
      maxTokens: 2000,
    });

    const evaluation = safeJsonParse(raw);

    if (!evaluation || !evaluation.scores) {
      // Fallback: assume passing score
      const fallback = {
        scores: {
          legal_accuracy: 7,
          completeness: 7,
          actionability: 7,
          citation_quality: 7,
          total: 28,
        },
        pass: false,
        threshold: 32,
        feedback: {
          strengths: [],
          weaknesses: ['Could not parse evaluation'],
          missing_topics: [],
          retry_instructions: 'Please provide more specific legal citations and actionable steps.',
        },
        improvement_signal: null,
      };
      span.end({ output: fallback });
      return fallback;
    }

    // Ensure total is computed
    if (!evaluation.scores.total) {
      evaluation.scores.total =
        (evaluation.scores.legal_accuracy || 0) +
        (evaluation.scores.completeness || 0) +
        (evaluation.scores.actionability || 0) +
        (evaluation.scores.citation_quality || 0);
    }

    // Determine pass/fail
    evaluation.pass = evaluation.scores.total >= (evaluation.threshold || 32);

    // Check for any single score <= 3 (auto-retry)
    const singleScores = [
      evaluation.scores.legal_accuracy,
      evaluation.scores.completeness,
      evaluation.scores.actionability,
      evaluation.scores.citation_quality,
    ];
    if (singleScores.some(s => s <= 3)) {
      evaluation.pass = false;
    }

    // Log scores to LangFuse
    trace.score({ name: 'legal_accuracy', value: evaluation.scores.legal_accuracy });
    trace.score({ name: 'completeness', value: evaluation.scores.completeness });
    trace.score({ name: 'actionability', value: evaluation.scores.actionability });
    trace.score({ name: 'citation_quality', value: evaluation.scores.citation_quality });
    trace.score({ name: 'total_score', value: evaluation.scores.total });

    span.end({ output: evaluation });
    return evaluation;
  } catch (err) {
    span.end({ output: { error: err.message } });
    // Return a default passing evaluation on error
    return {
      scores: {
        legal_accuracy: 7,
        completeness: 7,
        actionability: 7,
        citation_quality: 7,
        total: 28,
      },
      pass: false,
      threshold: 32,
      feedback: {
        strengths: [],
        weaknesses: ['Evaluation failed: ' + err.message],
        missing_topics: [],
        retry_instructions: 'Please provide more specific legal citations and actionable steps.',
      },
      improvement_signal: null,
    };
  }
};

module.exports = { evaluate };
