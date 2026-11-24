'use client';

import { useState } from 'react';

interface EvolucaoPsicologica {
  demandasPrincipais: string[];
  estadoEmocional: string;
  intervencoesEAnalise: string;
  planoEEncaminhamentos: string;
  pontosDeAtencao: string | null;
}

export default function Home() {
  const [anotacoesSessao, setAnotacoesSessao] = useState('');
  const [evolucao, setEvolucao] = useState<EvolucaoPsicologica | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!anotacoesSessao.trim()) return;

    setCarregando(true);
    setErro('');
    setEvolucao(null);
    setCopiado(false);

    try {
      const response = await fetch('/api/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anotacoesSessao }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao gerar evolução clínica.');
      }

      setEvolucao(data.evolucao);
    } catch (err: any) {
      setErro(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setCarregando(false);
    }
  }

  function copiarParaProntuario() {
    if (!evolucao) return;

    const textoFormatado = [
      `EVOLUÇÃO DE SESSÃO`,
      `\n1. Demandas Principais:\n${evolucao.demandasPrincipais.map((d) => `- ${d}`).join('\n')}`,
      `\n2. Estado Emocional e Comportamental:\n${evolucao.estadoEmocional}`,
      `\n3. Intervenções e Análise Clínica:\n${evolucao.intervencoesEAnalise}`,
      `\n4. Plano e Encaminhamentos:\n${evolucao.planoEEncaminhamentos}`,
      evolucao.pontosDeAtencao ? `\n5. Pontos de Atenção:\n${evolucao.pontosDeAtencao}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(textoFormatado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            NextRay POC
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Estruturação inteligente de anotações de atendimento para evolução de prontuário psicológico.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <label htmlFor="anotacoesSessao" className="block text-sm font-medium text-slate-700 mb-2">
              Anotações Brutas da Sessão
            </label>
            <textarea
              id="anotacoesSessao"
              rows={5}
              value={anotacoesSessao}
              onChange={(e) => setAnotacoesSessao(e.target.value)}
              placeholder="Ex: Paciente relata sobrecarga no trabalho e crises de ansiedade antes de reuniões. Demonstrou dificuldade em impor limites ao gestor. Trabalhamos identificação de pensamentos automáticos e estratégias de comunicação assertiva..."
              className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando || !anotacoesSessao.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? 'Estruturando evolução...' : 'Gerar Evolução de Prontuário'}
          </button>
        </form>

        {erro && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {evolucao && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Evolução Estruturada
              </h2>
              <button
                type="button"
                onClick={copiarParaProntuario}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {copiado ? 'Copiado para o prontuário!' : 'Copiar texto formatado'}
              </button>
            </div>

            {evolucao.pontosDeAtencao && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                <strong className="font-semibold block mb-1">Ponto de Atenção / Alerta Clínico:</strong>
                {evolucao.pontosDeAtencao}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                  Demandas Principais
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {evolucao.demandasPrincipais.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                  Estado Emocional e Comportamental
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  {evolucao.estadoEmocional}
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                  Intervenções e Análise Clínica
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  {evolucao.intervencoesEAnalise}
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
                  Plano e Encaminhamentos
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  {evolucao.planoEEncaminhamentos}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}