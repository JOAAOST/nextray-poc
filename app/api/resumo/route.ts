import { NextResponse } from 'next/server';

const PROMPT_SISTEMA = `
Você é um assistente clínico especializado em psicologia.
Analise as anotações da sessão e retorne APENAS um objeto JSON válido (sem blocos de código markdown), seguindo rigorosamente esta estrutura:
{
  "demandasPrincipais": ["string"],
  "estadoEmocional": "string",
  "intervencoesEAnalise": "string",
  "planoEEncaminhamentos": "string",
  "pontosDeAtencao": "string ou null (use null caso não haja alertas clínicos ou riscos)"
}
`;

function extrairJson(textoBruto: string) {
  const limpo = textoBruto.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return JSON.parse(limpo);
}

// 1. Provedor Principal: Google Gemini (com autodescoberta de modelo se der 404)
async function chamarGemini(texto: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const gerarComModelo = async (modelo: string) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${PROMPT_SISTEMA}\n\nAnotações da sessão:\n${texto}` }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    return res;
  };

  let res = await gerarComModelo('gemini-2.5-flash');

  // Se der 404, busca automaticamente um modelo Flash ativo na API do Google
  if (res.status === 404) {
    const listaRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listaRes.ok) {
      const listaData = await listaRes.json();
      const modeloAtivo = listaData.models?.find(
        (m: { name: string; supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name.includes('flash') &&
          !m.name.includes('lite') &&
          !m.name.includes('image') &&
          !m.name.includes('audio')
      );

      if (modeloAtivo) {
        const nomeLimpo = modeloAtivo.name.replace('models/', '');
        console.log(`🔄 Usando modelo Gemini ativo detectado: ${nomeLimpo}`);
        res = await gerarComModelo(nomeLimpo);
      }
    }
  }

  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`Erro Gemini (${res.status}): ${detalhe}`);
  }

  const data = await res.json();
  const conteudo = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return extrairJson(conteudo);
}

// 2. Provedor Secundário: Groq (com autodescoberta de modelo se der 404)
async function chamarGroq(texto: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada');

  const gerarComModelo = async (model: string) => {
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: PROMPT_SISTEMA },
          { role: 'user', content: `Anotações da sessão:\n${texto}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
  };

  let res = await gerarComModelo('llama-3.3-70b-versatile');

  // Se der 404, busca automaticamente um modelo de texto ativo na Groq
  if (res.status === 404) {
    const listaRes = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (listaRes.ok) {
      const listaData = await listaRes.json();
      const modeloAtivo = listaData.data?.find(
        (m: { id: string }) =>
          (m.id.includes('llama') || m.id.includes('qwen')) &&
          !m.id.includes('guard') &&
          !m.id.includes('whisper') &&
          !m.id.includes('vision')
      );

      if (modeloAtivo) {
        console.log(`🔄 Usando modelo Groq ativo detectado: ${modeloAtivo.id}`);
        res = await gerarComModelo(modeloAtivo.id);
      }
    }
  }

  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`Erro Groq (${res.status}): ${detalhe}`);
  }

  const data = await res.json();
  return extrairJson(data.choices[0].message.content);
}

// 3. Provedor Terciário: OpenAI (ChatGPT)
async function chamarOpenAI(texto: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        { role: 'user', content: `Anotações da sessão:\n${texto}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const detalhe = await res.text();
    throw new Error(`Erro OpenAI (${res.status}): ${detalhe}`);
  }

  const data = await res.json();
  return extrairJson(data.choices[0].message.content);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const textoSessao = body.anotacoesSessao;

    if (!textoSessao || !textoSessao.trim()) {
      return NextResponse.json(
        { erro: 'As anotações da sessão são obrigatórias.' },
        { status: 400 }
      );
    }

    // TENTATIVA 1: Google Gemini
    try {
      const evolucao = await chamarGemini(textoSessao);
      console.log('✅ Evolução gerada com sucesso via: Google Gemini');
      return NextResponse.json({ evolucao, provedor: 'Google Gemini' });
    } catch (erroGemini) {
      console.warn('⚠️ Gemini falhou, acionando fallback para Groq...', erroGemini);
    }

    // TENTATIVA 2: Groq
    try {
      const evolucao = await chamarGroq(textoSessao);
      console.log('✅ Evolução gerada com sucesso via: Groq');
      return NextResponse.json({ evolucao, provedor: 'Groq' });
    } catch (erroGroq) {
      console.warn('⚠️ Groq falhou, acionando fallback para ChatGPT...', erroGroq);
    }

    // TENTATIVA 3: OpenAI (ChatGPT)
    try {
      const evolucao = await chamarOpenAI(textoSessao);
      console.log('✅ Evolução gerada com sucesso via: OpenAI (ChatGPT)');
      return NextResponse.json({ evolucao, provedor: 'OpenAI (ChatGPT)' });
    } catch (erroOpenAI) {
      console.error('❌ Todos os provedores de IA falharam.', erroOpenAI);
      return NextResponse.json(
        { erro: 'Todos os serviços de IA estão indisponíveis no momento. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { erro: 'Erro interno ao processar a requisição.' },
      { status: 500 }
    );
  }
}