import { useEffect, useState } from 'react';
import { api } from '../servicos/api';

export default function ModeracaoEventos({ token, ehModerador }) {
  const [eventos, setEventos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState({
    titulo: '',
    descricao: '',
    localId: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    status: 'pendente'
  });

  async function carregar() {
    if (!token || !ehModerador) return;

    try {
      const [dadosEventos, dadosLocais] = await Promise.all([
        api.listarEventosNaoModerados(token),
        api.listarLocais('')
      ]);
      setEventos(dadosEventos);
      setLocais(dadosLocais);
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => {
    carregar();
  }, [token, ehModerador]);

  function iniciarEdicao(evento) {
    setEditandoId(evento.id);
    setFormulario({
      titulo: evento.titulo || '',
      descricao: evento.descricao || '',
      localId: evento.localId || '',
      data: (evento.data || '').slice(0, 10),
      horaInicio: evento.horaInicio || '',
      horaFim: evento.horaFim || '',
      status: evento.status || 'pendente'
    });
  }

  async function aprovar(id) {
    try {
      await api.aprovarEvento(id, token);
      setMensagem('Evento aprovado.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function rejeitar(id) {
    try {
      await api.rejeitarEvento(id, token);
      setMensagem('Evento rejeitado.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagar(id) {
    try {
      await api.apagarEventoModeracao(id, token);
      setMensagem('Evento apagado com sucesso.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarEdicao(id) {
    try {
      await api.editarEventoModeracao(
        id,
        {
          ...formulario,
          data: `${formulario.data}T00:00:00.000Z`
        },
        token
      );
      setMensagem('Evento atualizado.');
      setEditandoId(null);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!token || !ehModerador) {
    return (
      <main className="container painel-moderacao">
        <h2>Moderação de Eventos</h2>
        <p>Área disponível apenas para perfis de moderador.</p>
      </main>
    );
  }

  return (
    <main className="container painel-moderacao">
      <h2>Moderação de Eventos</h2>
      <p>Lista de eventos ainda não moderados (pendentes ou sinalizados).</p>

      <section className="lista-eventos">
        {eventos.map((evento) => (
          <article key={evento.id} className="card-evento moderacao-card">
            <h3>{evento.titulo}</h3>
            <p>{evento.descricao}</p>
            <p>
              <strong>Status:</strong> {evento.status}
            </p>
            <p>
              <strong>Criado por:</strong> {evento.criador?.nome}
            </p>
            <p>
              <strong>Data/Hora:</strong> {new Date(evento.data).toLocaleDateString('pt-BR')} - {evento.horaInicio}
            </p>
            <p>
              <strong>Local:</strong> {evento.local?.nome}
            </p>

            <div className="acoes-card">
              <button onClick={() => aprovar(evento.id)}>Aprovar</button>
              <button onClick={() => rejeitar(evento.id)}>Rejeitar</button>
              <button onClick={() => iniciarEdicao(evento)}>Editar</button>
              <button onClick={() => apagar(evento.id)}>Apagar</button>
            </div>

            {editandoId === evento.id ? (
              <section className="formulario moderacao-form">
                <label>
                  Título
                  <input
                    value={formulario.titulo}
                    onChange={(e) => setFormulario((a) => ({ ...a, titulo: e.target.value }))}
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    value={formulario.descricao}
                    onChange={(e) => setFormulario((a) => ({ ...a, descricao: e.target.value }))}
                  />
                </label>
                <label>
                  Local
                  <select
                    value={formulario.localId}
                    onChange={(e) => setFormulario((a) => ({ ...a, localId: e.target.value }))}
                  >
                    {locais.map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Data
                  <input
                    type="date"
                    value={formulario.data}
                    onChange={(e) => setFormulario((a) => ({ ...a, data: e.target.value }))}
                  />
                </label>
                <label>
                  Hora início
                  <input
                    type="time"
                    value={formulario.horaInicio}
                    onChange={(e) => setFormulario((a) => ({ ...a, horaInicio: e.target.value }))}
                  />
                </label>
                <label>
                  Hora fim
                  <input
                    type="time"
                    value={formulario.horaFim}
                    onChange={(e) => setFormulario((a) => ({ ...a, horaFim: e.target.value }))}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={formulario.status}
                    onChange={(e) => setFormulario((a) => ({ ...a, status: e.target.value }))}
                  >
                    <option value="pendente">pendente</option>
                    <option value="aprovado">aprovado</option>
                    <option value="rejeitado">rejeitado</option>
                    <option value="sinalizado">sinalizado</option>
                  </select>
                </label>
                <div className="acoes-card">
                  <button onClick={() => salvarEdicao(evento.id)}>Salvar edição</button>
                  <button onClick={() => setEditandoId(null)}>Cancelar</button>
                </div>
              </section>
            ) : null}
          </article>
        ))}
      </section>

      {mensagem ? <p className="sucesso">{mensagem}</p> : null}
      {erro ? <p className="erro">{erro}</p> : null}
    </main>
  );
}
