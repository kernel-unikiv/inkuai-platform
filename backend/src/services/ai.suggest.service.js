'use strict';
const { AppError } = require('../utils/apiResponse');

function getModel() {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '').trim();
  if (!key) throw new AppError('GEMINI_API_KEY não configurada.', 503);
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const g = new GoogleGenerativeAI(key);
  return g.getGenerativeModel({ model:'gemini-1.5-flash', generationConfig:{ maxOutputTokens:800, temperature:0.8 } });
}

async function suggestField({ field, context, currentValue, projectType }) {
  const model = getModel();

  const prompts = {
    title:       `Sugere 3 títulos académicos profissionais para um projecto de ${projectType||'software'} da IP/UNIKIVI Angola. Contexto: "${currentValue||''}". Responde APENAS com JSON: {"suggestions":["título1","título2","título3"]}`,
    description: `Escreve uma descrição académica completa (150-200 palavras) para um projecto de ${projectType||'software'} da IP/UNIKIVI Angola. Título/ideia: "${currentValue||''}". Inclui problema, solução e impacto. Responde apenas com o texto da descrição.`,
    tech_stack:  `Sugere o stack tecnológico ideal para um projecto de ${projectType||'software'}. Contexto: "${currentValue||''}". Responde APENAS com JSON: {"suggestions":["Tech1","Tech2","Tech3","Tech4","Tech5"]}`,
    tags:        `Sugere 5-8 tags/palavras-chave académicas para um projecto de ${projectType||'software'}. Contexto: "${currentValue||''}". Responde APENAS com JSON: {"suggestions":["tag1","tag2","tag3","tag4","tag5"]}`,
    article_body:`Escreve um artigo académico completo sobre: "${currentValue||context||'Inteligência Artificial em Angola'}". Inclui: introdução, desenvolvimento (3 secções), conclusão e referências. Formato Markdown. Escrita académica em Português de Angola.`,
    summary:     `Escreve um resumo académico de 2-3 frases para: "${currentValue||context||''}". Português de Angola, linguagem científica.`,
    idea:        `Desenvolve esta ideia de projecto para Angola: "${currentValue||''}". Escreve uma proposta estruturada com: problema, solução, impacto, tecnologias sugeridas e próximos passos. Português de Angola.`,
  };

  const prompt = prompts[field] || `Completa ou melhora este texto para um formulário académico: "${currentValue||''}". Responde apenas com o texto melhorado.`;
  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();

  if (['title','tech_stack','tags'].includes(field)) {
    try {
      const clean = text.replace(/```json\n?|\n?```/g,'').trim();
      return JSON.parse(clean);
    } catch { return { suggestions: [text] }; }
  }

  return { text };
}

async function fillForm({ formType, seedText, projectType }) {
  const model = getModel();

  const prompts = {
    project: `Cria um projecto académico completo para a plataforma INKU·AI da IP/UNIKIVI Angola.
Tipo: ${projectType||'software'}
Ideia base: "${seedText||'Sistema de IA para Angola'}"

Responde APENAS com JSON válido:
{
  "title": "Título do projecto",
  "description": "Descrição académica detalhada (150 palavras)",
  "tech_stack": ["Tech1","Tech2","Tech3","Tech4"],
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "type": "${projectType||'software'}",
  "github_repo_url": ""
}`,
    startup: `Cria uma startup tecnológica angolana para a plataforma INKU·AI da IP/UNIKIVI.
Ideia base: "${seedText||'Startup de IA em Angola'}"

Responde APENAS com JSON válido:
{
  "name": "Nome da Startup",
  "description": "Missão, visão e proposta de valor (100 palavras)",
  "sector": "IA/Software",
  "tags": ["tag1","tag2","tag3"]
}`,
    article: `Cria um artigo/ideia académica para a plataforma INKU·AI da IP/UNIKIVI Angola.
Ideia base: "${seedText||'Aplicação de IA em Angola'}"

Responde APENAS com JSON válido:
{
  "title": "Título do artigo",
  "summary": "Resumo em 2 frases",
  "body": "Corpo completo do artigo em Markdown (400-600 palavras) com introdução, desenvolvimento e conclusão",
  "tags": ["tag1","tag2","tag3"],
  "type": "article"
}`,
    classroom: `Cria um espaço de trabalho (classroom) para um projecto académico da IP/UNIKIVI Angola.
Tipo de projecto: ${projectType||'software'}
Contexto: "${seedText||'Projecto académico'}"

Responde APENAS com JSON válido:
{
  "name": "Nome do espaço de trabalho",
  "description": "Descrição e objectivos (80 palavras)",
  "settings": {
    "deadline_days": 14,
    "language": "python",
    "requirements": "Descreve o que os alunos devem entregar",
    "evaluation_criteria": ["Critério 1","Critério 2","Critério 3"]
  }
}`
  };

  const prompt = prompts[formType] || prompts.project;
  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();

  try {
    const clean = text.replace(/```json\n?|\n?```/g,'').trim();
    return JSON.parse(clean);
  } catch {
    return { error: 'Não foi possível parsear a resposta da IA.', raw: text };
  }
}

async function summarizeText(text, maxWords = 100) {
  const model  = getModel();
  const prompt = `Resume este texto em máximo ${maxWords} palavras em Português de Angola, linguagem académica:\n\n${text.substring(0,3000)}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { suggestField, fillForm, summarizeText };
