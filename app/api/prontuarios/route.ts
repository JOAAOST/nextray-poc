import { envelopeValido } from "../../../utils/cripto";
import { obterArmazenamento } from "../../../utils/armazenamento";

// POST: recebe o envelope cifrado pelo navegador e o guarda. Recusa texto em claro.
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const conteudo = (corpo as { conteudo_cifrado?: unknown })?.conteudo_cifrado;
  if (!envelopeValido(conteudo)) {
    return Response.json({ erro: "O conteúdo deve chegar cifrado (formato v1.sal.iv.cifra)" }, { status: 422 });
  }
  const r = await obterArmazenamento().salvar(conteudo);
  return Response.json({ id: r.id, criado_em: r.criado_em }, { status: 201 });
}

// GET: devolve o que está na base, para mostrar à banca que são apenas strings ilegíveis.
export async function GET() {
  return Response.json(await obterArmazenamento().listar());
}
