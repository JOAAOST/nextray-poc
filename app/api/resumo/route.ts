import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const anotacoesSessao = body.anotacoesSessao || body.textoMedico;

    if (!anotacoesSessao) {
      return NextResponse.json(
        { erro: 'As anotações da sessão são obrigatórias.' },
        { status: 400 }
      );
    }

    const prompt = `
      Você é um assistente clínico especializado em Psicologia, focado em ajudar psicólogos a redigirem evoluções de prontuário objetivas, éticas e bem estruturadas (alinhadas às diretrizes do CFP, sem julgamentos morais e preservando o sigilo técnico).

      Analise as anotações brutas da sessão abaixo e retorne EXCLUSIVAMENTE um objeto JSON válido com a seguinte estrutura:
      {
        "demandasPrincipais": ["lista com 2 a 4 temas ou queixas centrais trazidos na sessão"],
        "estadoEmocional": "descrição objetiva do humor, afeto, discurso e comportamento observados",
        "intervencoesEAnalise": "manejos clínicos realizados, padrões identificados e hipóteses de trabalho",
        "planoEEncaminhamentos": "combinados, reflexões propostas ou foco para as próximas sessões",
        "pontosDeAtencao": "sinais de alerta, risco ou gatilhos críticos que exigem acompanhamento próximo (ou null se não houver)"
      }

      Anotações da sessão:
      "${anotacoesSessao}"
    `;

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;

    const googleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error('Erro detalhado da Google:', data);
      return NextResponse.json({ erro: 'Falha ao processar com o Gemini.' }, { status: 500 });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const evolucao = JSON.parse(cleanJson);

    return NextResponse.json({ evolucao }, { status: 200 });
  } catch (error) {
    console.error('Erro no servidor:', error);
    return NextResponse.json(
      { erro: 'Ocorreu uma falha ao estruturar a evolução da sessão.' },
      { status: 500 }
    );
  }
}